import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createServer } from 'vite';
import axios from 'axios';
const originalAxiosPost = axios.post;
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage = storage;
globalThis.window = {
  localStorage: storage,
  location: { origin: 'http://localhost:5173' },
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout,
};
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
});
const el = React.createElement;
const text = (node) =>
  !node
    ? ''
    : typeof node === 'string'
      ? node
      : Array.isArray(node)
        ? node.map(text).join('')
        : (node.children || []).map(text).join('');
const flush = () => new Promise((resolve) => setImmediate(resolve));
let renderer;
try {
  const load = (file) => vite.ssrLoadModule(`/src/${file}`);
  const mount = async (element) => {
    await act(async () => {
      renderer = TestRenderer.create(element);
      await flush();
    });
  };
  const unmount = () => {
    act(() => renderer.unmount());
    renderer = null;
  };
  const button = (label) =>
    renderer.root.findAllByType('button').find((node) => text(node) === label);
  const route = (component, path = '/', pattern = path) =>
    el(
      MemoryRouter,
      {
        initialEntries: [path],
        future: { v7_startTransition: true, v7_relativeSplatPath: true },
      },
      el(Routes, {}, el(Route, { path: pattern, element: component })),
    );
  const { default: api } = await load('services/api.ts');
  const media = await load('services/media.ts');
  const file = new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])],
    'photo.png',
    { type: 'image/png' },
  );
  const image = {
    uploadId: 'upload',
    entityId: 'new-player',
    storageKey: 'public/players/new-player/p.png',
    contentType: 'image/png',
    size: file.size,
    url: 'https://d1grgd8g6bpbb7.cloudfront.net/players/new-player/p.png',
  };
  const calls = [];
  let uploadTarget;
  api.post = async (path, data) => {
    calls.push({ path, data });
    if (path === '/api/media/presign')
      uploadTarget = {
        purpose: data.purpose,
        entityId: data.entityId,
        playerType: data.playerType,
      };
    return {
      data:
        path === '/api/media/presign'
          ? {
              uploadId: 'upload',
              upload: {
                url: 'https://s3.example/direct',
                fields: {
                  key: 'private/uploads/upload/photo.png',
                  Policy: 'signed-policy',
                },
              },
            }
          : image,
    };
  };
  const previousPost = axios.post;
  let direct;
  axios.post = async (url, form, config) => {
    direct = { url, form, config };
    config.onUploadProgress({ loaded: 12, total: 12 });
    return { status: 204 };
  };
  let progress;
  try {
    assert.deepEqual(
      await media.uploadImage(
        file,
        { purpose: 'player-photo', playerType: 'team' },
        (value) => (progress = value),
      ),
      image,
    );
    assert.equal(calls[0].path, '/api/media/presign');
    assert.equal(calls[0].data.purpose, 'player-photo');
    assert.equal(calls[0].data.size, file.size);
    assert.ok(!('storageKey' in calls[0].data));
    assert.equal(direct.url, 'https://s3.example/direct');
    assert.equal(direct.config.withCredentials, false);
    assert.ok(!direct.config.headers?.Authorization);
    assert.equal(direct.form.get('key'), 'private/uploads/upload/photo.png');
    assert.equal(direct.form.get('file').type, 'image/png');
    assert.equal(progress, 100);
    assert.equal(calls[1].path, '/api/media/upload/complete');
  } finally {
    axios.post = previousPost;
  }

  const { default: Upload } = await load('components/ui/ImageUpload.tsx');
  const busy = [],
    changes = [];
  let resolveUpload,
    uploadCalls = 0;
  axios.post = () => {
    uploadCalls++;
    return new Promise((resolve) => (resolveUpload = resolve));
  };
  function UploadHarness() {
    const [value, setValue] = React.useState(
      'https://res.cloudinary.com/legacy/photo.png',
    );
    return el(Upload, {
      purpose: 'player-photo',
      playerType: 'team',
      entityId: 'player',
      value,
      onBusyChange: (v) => busy.push(v),
      onChange: (v) => {
        changes.push(v);
        setValue(v?.url || '');
      },
    });
  }
  await mount(el(UploadHarness));
  const input = () => renderer.root.findByProps({ type: 'file' });
  act(() =>
    input().props.onChange({
      target: {
        files: [new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' })],
        value: 'bad',
      },
    }),
  );
  assert.equal(uploadCalls, 0);
  assert.ok(text(renderer.toJSON()).includes('PNG, JPEG או WebP עד 5MB'));
  act(() =>
    input().props.onChange({ target: { files: [file], value: 'photo' } }),
  );
  assert.ok(text(renderer.toJSON()).includes('מעלה תמונה'));
  assert.equal(input().props.disabled, true);
  assert.ok(renderer.root.findByType('img').props.src.startsWith('blob:'));
  assert.equal(changes.length, 0, 'a file is not attached before verification');
  await act(async () => {
    await flush();
    resolveUpload(image);
    await flush();
  });
  assert.deepEqual(busy, [true, false]);
  assert.equal(changes[0].uploadId, 'upload');
  assert.equal(renderer.root.findByType('img').props.src, image.url);
  axios.post = async () => {
    throw new Error('Network Error');
  };
  await act(async () => {
    input().props.onChange({ target: { files: [file], value: 'photo' } });
    await flush();
  });
  assert.equal(
    changes.length,
    1,
    'failed replacement keeps the old attachment',
  );
  assert.equal(renderer.root.findByType('img').props.src, image.url);
  assert.ok(!text(renderer.toJSON()).includes('Network Error'));
  act(() => button('הסר תמונה').props.onClick());
  assert.equal(changes.at(-1), null);
  assert.equal(renderer.root.findAllByType('img').length, 0);
  unmount();
  axios.post = async () => ({ status: 204 });

  const { store } = await load('store/index.ts');
  const { ToastProvider } = await load('components/ui/ToastProvider.tsx');
  const { ConfirmProvider } = await load('components/ui/ConfirmProvider.tsx');
  const state = {
    ...store.getState(),
    auth: { ...store.getState().auth, user: { id: 'admin', role: 'admin' } },
    teams: {
      ...store.getState().teams,
      teams: [],
      manageablePlayers: [],
      isLoading: false,
      error: null,
    },
    players: { players: [], isLoading: false, error: null },
    badges: { badges: [], awards: [], isLoading: false, error: null },
    seasons: { seasons: [], activeSeason: null, isLoading: false, error: null },
  };
  const fixtureStore = {
    getState: () => state,
    subscribe: store.subscribe,
    dispatch: store.dispatch,
  };
  const provided = (element) =>
    el(
      Provider,
      { store: fixtureStore },
      el(ToastProvider, {}, el(ConfirmProvider, {}, element)),
    );
  const { default: teams } = await load('features/teams/teamsService.ts');
  const { default: players } = await load('features/players/playersService.ts');
  const { default: badges } = await load('features/badges/badgesService.ts');
  const { default: seasons } = await load('features/seasons/seasonsService.ts');
  teams.getTeams = async () => [];
  teams.getTeachers = async () => [
    { id: 'teacher', name: 'מורה', role: 'admin' },
  ];
  teams.getManageablePlayers = async () => [];
  players.getPlayers = async () => [];
  badges.getBadges = async () => [];
  badges.getBadgeAwards = async () => [];
  seasons.getSeasons = async () => [];
  const { default: TeamPage } = await load('pages/TeamPage.tsx');
  const { internalTournaments } = await load('services/internalTournaments.ts');
  const members = [
    {
      id: 'unranked',
      firstName: 'ללא',
      lastName: 'דירוג',
      city: 'חיפה',
      playerNumber: 'U',
    },
    {
      id: 'two',
      firstName: 'שני',
      lastName: 'כהן',
      city: 'חיפה',
      playerNumber: '2',
    },
    {
      id: 'one',
      firstName: 'ראשון',
      lastName: 'כהן',
      city: 'תל אביב',
      playerNumber: '1',
    },
  ];
  const team = {
    id: 'team',
    name: 'מאוחדת',
    isActive: true,
    playerCount: 3,
    players: members,
  };
  teams.getTeam = async () => team;
  internalTournaments.rankings = async (id) => {
    assert.equal(id, 'team');
    return {
      rankings: [
        { playerId: 'two', position: 2, points: 3, tournaments: 1 },
        { playerId: 'one', position: 1, points: 6, tournaments: 2 },
      ],
    };
  };
  await mount(
    provided(route(el(TeamPage), '/manage/teams/team', '/manage/teams/:id')),
  );
  assert.ok(!button('דירוג וסטטיסטיקה'));
  assert.equal(renderer.root.findAllByType('table').length, 1);
  assert.deepEqual(renderer.root.findAllByType('th').map(text), [
    'מיקום ↑',
    'שם מלא',
    'עיר',
    'מספר שחקן',
    'נקודות',
    'טורנירים',
    'פעולות',
  ]);
  const rows = renderer.root.findByType('tbody').findAllByType('tr');
  assert.ok(text(rows[0]).startsWith('1ראשון'));
  assert.ok(text(rows[1]).startsWith('2שני'));
  assert.ok(text(rows[2]).startsWith('—ללא'));
  assert.equal(rows.length, 3, 'unranked members remain visible');
  assert.ok(button('עריכת שחקן') && button('הסרה מהנבחרת'));
  // Team-context bulk creation has implicit team, optional biography/birth/photo.
  act(() =>
    renderer.root
      .findAllByType('summary')
      .find((n) => text(n) === 'הוסף / טען ילדים')
      .props.onClick(),
  );
  assert.ok(renderer.root.findByProps({ 'aria-label': 'תיאור קצר' }));
  assert.ok(renderer.root.findByProps({ 'aria-label': 'תאריך לידה' }));
  assert.equal(renderer.root.findAllByProps({ type: 'file' }).length, 1);
  let finishBulkUpload;
  axios.post = () =>
    new Promise((resolve) => {
      finishBulkUpload = resolve;
    });
  await act(async () => {
    renderer.root
      .findByProps({ type: 'file' })
      .props.onChange({ target: { files: [file], value: 'photo' } });
    await flush();
  });
  assert.equal(button('שמור חברי נבחרת').props.disabled, true);
  act(() =>
    renderer.root
      .findByProps({ 'aria-label': 'שם פרטי 1' })
      .props.onChange({ target: { value: 'שם מעודכן' } }),
  );
  await act(async () => {
    finishBulkUpload({ status: 204 });
    await flush();
  });
  assert.equal(
    renderer.root.findByProps({ 'aria-label': 'שם פרטי 1' }).props.value,
    'שם מעודכן',
    'an async image response preserves other member edits',
  );
  axios.post = async () => ({ status: 204 });
  act(() => renderer.root.findByProps({'aria-label':'שם משפחה 1'}).props.onChange({target:{value:'ילד'}}));
  act(() => renderer.root.findByProps({'aria-label':'מספר שחקן'}).props.onChange({target:{value:'P-1'}}));
  await act(async () => { renderer.root.findByType('form').props.onSubmit({preventDefault(){}}); await flush(); });
  const bulkRequest = calls.find(call => call.path === '/api/teams/team/players');
  assert.equal(bulkRequest.data.players[0].firstName,'שם מעודכן');
  assert.equal(bulkRequest.data.players[0].photoUploadId,'upload');
  assert.ok(!('photoUrl' in bulkRequest.data.players[0]),'transient preview URLs are not persisted');
  unmount();

  const { default: PhotoField } = await load(
    'features/players/components/PlayerPhotoField.tsx',
  );
  api.get = async () => {
    throw new Error('Network Error');
  };
  let removedWithoutPreview;
  await mount(
    el(PhotoField, {
      playerType: 'quarterly',
      entityId: 'club',
      value: '',
      hasPhoto: true,
      onChange: (value) => (removedWithoutPreview = value),
      onBusyChange: () => {},
    }),
  );
  assert.ok(
    button('הסר תמונה'),
    'a failed private preview does not prevent removal',
  );
  act(() => button('הסר תמונה').props.onClick());
  assert.equal(removedWithoutPreview, null);
  unmount();

  const { default: AdminPlayers } = await load('pages/admin/AdminPlayers.tsx');
  let teamInput, clubInput, editInput;
  players.createTeamPlayer = async (input) => {
    teamInput = input;
    return { id: 'new', ...input };
  };
  players.createQuarterlyPlayer = async (input) => {
    clubInput = input;
    return { id: 'club', ...input };
  };
  players.updatePlayer = async (id, input) => {
    editInput = input;
    return { id, ...input };
  };
  teams.getTeams = async () => [{ id: 'team', name: 'נבחרת', isActive: true }];
  const dialog = () => renderer.root.findByProps({ role: 'dialog' });
  const setInput = (label, value) =>
    act(() =>
      dialog()
        .findByProps({ 'aria-label': label })
        .props.onChange({ target: { value } }),
    );
  await mount(provided(route(el(AdminPlayers))));
  await act(async () => {
    button('הוסף שחקן נבחרת').props.onClick();
    await flush();
  });
  let names = dialog().findAllByType('input');
  act(() => names[0].props.onChange({ target: { value: 'לביא' } }));
  act(() => names[1].props.onChange({ target: { value: 'כהן' } }));
  setInput('מספר שחקן', '0001');
  setInput('תיאור קצר', 'אוהב ללמוד');
  setInput('תאריך לידה', '2016-10-13');
  act(() =>
    dialog()
      .findByType('select')
      .props.onChange({ target: { value: 'team' } }),
  );
  await act(async () => {
    dialog()
      .findByProps({ type: 'file' })
      .props.onChange({ target: { files: [file], value: 'photo' } });
    await flush();
  });
  await act(async () => {
    dialog()
      .findByType('form')
      .props.onSubmit({ preventDefault() {} });
    await flush();
  });
  assert.equal(teamInput.description, 'אוהב ללמוד');
  assert.equal(teamInput.dateOfBirth, '2016-10-13');
  assert.equal(teamInput.photoUploadId, 'upload');
  assert.equal(teamInput.teamId, 'team');
  await act(async () => {
    button('הוסף שחקן חוגים').props.onClick();
    await flush();
  });
  names = dialog()
    .findAllByType('input')
    .filter((input) => input.props.type !== 'file');
  for (const [i, value] of [
    [0, 'ילד'],
    [1, 'חוג'],
    [2, 'מועדון'],
  ])
    act(() => names[i].props.onChange({ target: { value } }));
  assert.equal(
    dialog().findAllByProps({ 'aria-label': 'תאריך לידה' }).length,
    0,
  );
  await act(async () => {
    dialog()
      .findAllByType('button')
      .find((b) => text(b) === 'הוסף שחקן חוגים')
      .props.onClick();
    await flush();
  });
  assert.equal(clubInput.club, 'מועדון');
  assert.equal(
    clubInput.photoUploadId,
    undefined,
    'photo is optional for creation',
  );
  unmount();
  state.players.players = [
    {
      id: 'club',
      firstName: 'ילד',
      lastName: 'חוג',
      club: 'מועדון',
      isActive: true,
      playerType: 'quarterly',
      photoMedia: { storageKey: 'private/players/club/photo.png' },
    },
  ];
  api.get = async (path) => {
    assert.equal(path, '/api/media/players/club/photo');
    return { data: { url: 'https://s3.example/private-preview?expires=300' } };
  };
  await mount(provided(route(el(AdminPlayers))));
  await act(async () => {
    button('ערוך').props.onClick();
    await flush();
  });
  assert.ok(
    dialog()
      .findByType('img')
      .props.src.startsWith('https://s3.example/private-preview'),
  );
  act(() => button('הסר תמונה').props.onClick());
  await act(async () => {
    button('שמור שינויים').props.onClick();
    await flush();
  });
  assert.equal(editInput.photoUploadId, null);
  assert.ok(!('dateOfBirth' in editInput));
  unmount();

  axios.post = async () => ({ status: 204 });
  const { default: ManageTeams } = await load('pages/manage/ManageTeams.tsx');
  let createdTeam;
  teams.createTeam = async (input) => {
    createdTeam = input;
    return { id: 'created-team', ...input };
  };
  await mount(provided(route(el(ManageTeams), '/manage/teams')));
  act(() => button('נבחרת חדשה').props.onClick());
  const form = () => renderer.root.findByType('form');
  act(() =>
    form()
      .findAllByType('input')
      .find((i) => i.props.type !== 'file')
      .props.onChange({ target: { value: 'נבחרת חדשה' } }),
  );
  act(() =>
    form()
      .findByType('select')
      .props.onChange({ target: { value: 'teacher' } }),
  );
  await act(async () => {
    form()
      .findByProps({ type: 'file' })
      .props.onChange({ target: { files: [file], value: 'image' } });
    await flush();
  });
  assert.equal(uploadTarget.purpose, 'team-logo');
  await act(async () => {
    form().props.onSubmit({ preventDefault() {} });
    await flush();
  });
  assert.equal(createdTeam.logoUploadId, 'upload');
  assert.ok(!('logoPublicId' in createdTeam));
  unmount();

  const badge = {
    id: 'badge',
    name: 'הישג',
    description: 'למד משהו חדש',
    icon: 'Trophy',
    isActive: true,
    image: 'https://d1grgd8g6bpbb7.cloudfront.net/badges/badge/a.png',
  };
  const season = {
    id: 'season',
    name: 'עונת סתיו',
    status: 'active',
    startedAt: '2026-10-01',
    closedAt: null,
  };
  const award = {
    id: 'award',
    player: { id: 'player', firstName: 'לביא', lastName: 'כהן' },
    badge,
    season,
    awardedAt: '2026-10-01',
    awardedBy: { name: 'מורה' },
  };
  state.badges.badges = [badge];
  state.badges.awards = [award];
  state.seasons.activeSeason = season;
  state.seasons.seasons = [season];
  badges.getBadges = async () => [badge];
  badges.getBadgeAwards = async () => [award];
  seasons.getSeasons = async () => [season];
  let revoked, changedBadge, deletedSeason;
  badges.revokeAward = async (id) => {
    revoked = id;
    return { id };
  };
  badges.updateBadge = async (id, input) => {
    changedBadge = { id, input };
    return { ...badge, ...input };
  };
  seasons.deleteSeason = async (id) => {
    deletedSeason = id;
    return { id };
  };
  const { default: ManageBadges } = await load('pages/manage/ManageBadges.tsx');
  await mount(provided(route(el(ManageBadges), '/manage/badges')));
  assert.ok(text(renderer.toJSON()).includes('עונת סתיו'));
  assert.ok(
    renderer.root
      .findAllByType('img')
      .some((img) => img.props.src === badge.image),
  );
  await act(async () => {
    button('הסר תג').props.onClick();
    await flush();
  });
  assert.equal(revoked, undefined);
  const confirm = () => renderer.root.findByProps({ role: 'alertdialog' });
  await act(async () => {
    confirm()
      .findAllByType('button')
      .find((b) => text(b) === 'הסר תג')
      .props.onClick();
    await flush();
  });
  assert.equal(revoked, 'award');
  assert.ok(!store.getState().badges.awards.some((a) => a.id === 'award'));
  act(() => button('ערוך').props.onClick());
  assert.ok(!text(renderer.toJSON()).includes('שם lucide'));
  await act(async () => {
    renderer.root
      .findByProps({ type: 'file' })
      .props.onChange({ target: { files: [file], value: 'badge' } });
    await flush();
  });
  assert.deepEqual(uploadTarget, {
    purpose: 'badge-image',
    entityId: 'badge',
    playerType: undefined,
  });
  await act(async () => {
    button('שמור').props.onClick();
    await flush();
  });
  assert.equal(changedBadge.input.imageUploadId, 'upload');
  let newBadgeInput;
  badges.createBadge = async (input) => {
    newBadgeInput = input;
    return { ...badge, id: 'new-badge', ...input };
  };
  act(() => button('תג חדש').props.onClick());
  act(() =>
    renderer.root
      .findAllByType('input')
      .find((input) => input.props.type !== 'file')
      .props.onChange({ target: { value: 'תג ללא תמונה' } }),
  );
  await act(async () => {
    button('צור תג').props.onClick();
    await flush();
  });
  assert.equal(
    newBadgeInput.imageUploadId,
    undefined,
    'badge creation does not require an image',
  );
  act(() => button('תג חדש').props.onClick());
  act(() =>
    renderer.root
      .findAllByType('input')
      .find((input) => input.props.type !== 'file')
      .props.onChange({ target: { value: 'תג עם תמונה' } }),
  );
  await act(async () => {
    renderer.root
      .findByProps({ type: 'file' })
      .props.onChange({ target: { files: [file], value: 'badge' } });
    await flush();
  });
  await act(async () => {
    button('צור תג').props.onClick();
    await flush();
  });
  assert.equal(newBadgeInput.imageUploadId, 'upload');
  assert.equal(uploadTarget.purpose, 'badge-image');
  await act(async () => {
    button('מחק עונה פעילה').props.onClick();
    await flush();
  });
  assert.equal(deletedSeason, undefined);
  await act(async () => {
    confirm()
      .findAllByType('button')
      .find((b) => text(b) === 'מחק עונה')
      .props.onClick();
    await flush();
  });
  assert.equal(deletedSeason, 'season');
  assert.equal(store.getState().seasons.activeSeason, null);
  unmount();
  state.seasons.activeSeason = null;
  state.seasons.seasons = [];
  seasons.getSeasons = async () => [];
  await mount(provided(route(el(ManageBadges), '/manage/badges')));
  assert.equal(button('הענק').props.disabled, true);
  assert.ok(text(renderer.toJSON()).includes('יש לפתוח עונת תגים פעילה'));
  unmount();

  const { default: PublicPlayer } = await load('pages/AllStarsPlayerPage.tsx');
  api.get = async () => ({
    data: {
      id: 'player',
      firstName: 'לביא',
      lastName: 'כהן',
      city: 'חיפה',
      team: null,
      teamRanking: null,
      description: 'אוהב ללמוד',
      age: 10,
      photoUrl: image.url,
      badges: [
        {
          name: badge.name,
          description: badge.description,
          image: badge.image,
          seasonName: season.name,
          awardedAt: award.awardedAt,
          icon: '',
        },
      ],
    },
  });
  await mount(
    route(
      el(PublicPlayer),
      '/all-stars/players/player',
      '/all-stars/players/:playerId',
    ),
  );
  assert.ok(text(renderer.toJSON()).includes('גיל: 10'));
  assert.ok(text(renderer.toJSON()).includes('אוהב ללמוד'));
  assert.ok(text(renderer.toJSON()).includes('עונת סתיו'));
  assert.equal(renderer.root.findAllByType('img').length, 2);
  assert.ok(!text(renderer.toJSON()).includes('2016-10-13'));
  unmount();
  console.log(
    '2026.10.2 UI checks passed: authenticated presign/direct upload/verification, preview/busy/error/removal, unified canonical ranking including unranked members, optional team/club photos and biography/birth management, generic team/badge uploads, Season-aware badge display and confirmed revocation/Season deletion.',
  );
} finally {
  axios.post = originalAxiosPost;
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}
