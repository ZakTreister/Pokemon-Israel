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
    renderer.root.findAllByType('button').find((node) => text(node) === label || node.props['aria-label'] === label);
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
    players: {
      players: [],
      isLoading: false,
      error: null,
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    },
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
  players.getPlayers = async () => ({
    items: state.players.players,
    total: state.players.players.length,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  });
  players.duplicates = async () => [];
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
  act(() =>
    renderer.root
      .findByProps({ 'aria-label': 'שם משפחה 1' })
      .props.onChange({ target: { value: 'ילד' } }),
  );
  act(() =>
    renderer.root
      .findByProps({ 'aria-label': 'מספר שחקן' })
      .props.onChange({ target: { value: 'P-1' } }),
  );
  await act(async () => {
    renderer.root.findByType('form').props.onSubmit({ preventDefault() {} });
    await flush();
  });
  const bulkRequest = calls.find(
    (call) => call.path === '/api/teams/team/players',
  );
  assert.equal(bulkRequest.data.players[0].firstName, 'שם מעודכן');
  assert.equal(bulkRequest.data.players[0].photoUploadId, 'upload');
  assert.ok(
    !('photoUrl' in bulkRequest.data.players[0]),
    'transient preview URLs are not persisted',
  );
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
  assert.equal(clubInput.city, 'מועדון');
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
      city: 'מועדון',
      isActive: true,
      playerType: 'quarterly',
      photoMedia: { storageKey: 'private/players/club/photo.png' },
    },
  ];
  await mount(provided(route(el(AdminPlayers))));
  await act(async () => {
    button('עריכת שחקן').props.onClick();
    await flush();
  });
  assert.equal(
    dialog().findAllByProps({ type: 'file' }).length,
    0,
    'regular editor has no media controls',
  );
  await act(async () => {
    button('שמור שינויים').props.onClick();
    await flush();
  });
  assert.ok(!('photoUploadId' in editInput));
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
  // 2026.10.3 extends the same domain verification, rather than a parallel harness.
  const { default: PlayerEditor } = await load(
    'features/players/components/PlayerEditDialog.tsx',
  );
  const { pokemonImageUrl, playerEditSchema } = await load(
    'features/players/utils/playerProfile.ts',
  );
  assert.equal(
    pokemonImageUrl(' Iron  Hands '),
    'https://r2.limitlesstcg.net/pokemon/gen9/iron-hands.png',
  );
  const editFixture = {
    id: 'v3',
    firstName: 'Test',
    lastName: 'Child',
    city: 'City',
    playerType: 'team',
    isActive: true,
    user: null,
  };
  let savedProfile;
  players.updatePlayer = async (id, input) => {
    savedProfile = input;
    return { ...editFixture, ...input };
  };
  await mount(
    provided(
      route(
        el(PlayerEditor, {
          player: editFixture,
          onClose: () => {},
          onSaved: async () => {},
        }),
      ),
    ),
  );
  assert.ok(dialog().props.className.includes('max-h-'));
  assert.ok(
    dialog().findByType('form').props.className.includes('md:grid-cols-2'),
  );
  assert.equal(
    dialog().findAllByProps({ type: 'file' }).length,
    2,
    'photo and deck are distinct',
  );
  act(() =>
    dialog()
      .findAllByProps({ type: 'date' })
      .find((input) => input.props['aria-label'] === 'תאריך הצטרפות')
      .props.onChange({ target: { value: '2020-01-01' } }),
  );
  act(() =>
    dialog()
      .findByProps({ 'aria-label': 'פוקימון 1' })
      .props.onChange({ target: { value: ' Iron  Hands ' } }),
  );
  for (let i = 1; i < 6; i++) act(() => button('הוסף פוקימון').props.onClick());
  assert.equal(button('הוסף פוקימון').props.disabled, true);
  assert.equal(
    dialog()
      .findAllByType('input')
      .filter((input) => input.props['aria-label']?.startsWith('פוקימון '))
      .length,
    6,
  );
  await act(async () => {
    button('שמור שינויים').props.onClick();
    await flush();
  });
  assert.deepEqual(savedProfile.pokemon, ['Iron Hands']);
  assert.equal(savedProfile.joinedAt, '2020-01-01');
  assert.ok(
    !playerEditSchema.safeParse({ ...savedProfile, pokemon: ['Pikachu1'] })
      .success,
  );
  unmount();

  const { default: TeamEditor } = await load(
    'features/teams/components/TeamEditDialog.tsx',
  );
  const { default: TeamCard } = await load(
    'features/teams/components/OperationalTeamCard.tsx',
  );
  let teamSaved;
  teams.updateTeam = async (id, input) => {
    teamSaved = input;
    return { ...team, ...input };
  };
  await mount(
    provided(
      route(
        el(TeamCard, {
          team: { ...team, logo: 'https://example.com/logo.png' },
          members: true,
        }),
      ),
    ),
  );
  assert.equal(
    renderer.root.findByType('img').props.src,
    'https://example.com/logo.png',
  );
  await act(async () => {
    button('עריכת נבחרת').props.onClick();
    await flush();
  });
  assert.equal(renderer.root.findAllByType(TeamEditor).length, 1);
  act(() =>
    dialog()
      .findAllByType('input')
      .find(
        (input) =>
          input.props.type !== 'file' && input.props.type !== 'checkbox',
      )
      .props.onChange({ target: { value: 'Renamed' } }),
  );
  await act(async () => {
    button('שמור שינויים').props.onClick();
    await flush();
  });
  assert.equal(teamSaved.name, 'Renamed');
  assert.equal(renderer.root.findAllByType(TeamEditor).length, 0);
  unmount();
  state.auth.user.role = 'judge';
  await mount(provided(route(el(TeamCard, { team, members: true }))));
  assert.ok(!button('עריכת נבחרת'));
  unmount();
  state.auth.user.role = 'admin';

  const { default: Events } = await load('pages/TournamentsPage.tsx');
  const listRequests = [];
  api.get = async (path, { params }) => {
    listRequests.push({ path, params });
    return {
      data: {
        items: [],
        total: 30,
        page: params.page,
        pageSize: 25,
        totalPages: 2,
      },
    };
  };
  await mount(route(el(Events), '/tournaments'));
  assert.equal(listRequests.at(-1).params.page, 1);
  await act(async () => {
    button('הבא').props.onClick();
    await flush();
  });
  assert.equal(listRequests.at(-1).params.page, 2);
  await act(async () => {
    renderer.root
      .findByType('input')
      .props.onChange({ target: { value: 'query' } });
    await flush();
  });
  assert.equal(listRequests.at(-1).params.page, 1);
  assert.equal(listRequests.at(-1).params.search, 'query');
  unmount();

  const { default: UpdateEditor } = await load(
    'features/updates/components/UpdateEditDialog.tsx',
  );
  const { default: updatesService } = await load(
    'features/updates/updatesService.ts',
  );
  const { default: UpdateAction } = await load(
    'features/updates/components/UpdateAction.tsx',
  );
  let updateSaved;
  updatesService.createUpdate = async (input) => {
    updateSaved = input;
    return { id: 'update', ...input };
  };
  await mount(el(UpdateEditor, { onClose: () => {}, onSaved: async () => {} }));
  const updateInput = (index, value) =>
    act(() =>
      dialog()
        .findAllByType('input')
        .filter((input) => input.props.type !== 'file')
        [index].props.onChange({ target: { value } }),
    );
  updateInput(0, ' Manager title ');
  updateInput(1, 'Exact CTA');
  await act(async () => {
    button('שמור').props.onClick();
    await flush();
  });
  assert.ok(renderer.root.findByProps({ role: 'alert' }));
  assert.equal(updateSaved, undefined);
  updateInput(2, 'https://example.com');
  await act(async () => {
    button('שמור').props.onClick();
    await flush();
  });
  assert.equal(updateSaved.title, 'Manager title');
  assert.equal(updateSaved.ctaText, 'Exact CTA');
  unmount();
  await mount(
    el(UpdateAction, {
      update: { ...updateSaved, id: 'news', date: '2026-10-13', content: '' },
    }),
  );
  const cta = renderer.root.findByType('a');
  assert.equal(text(cta), 'Exact CTA');
  assert.equal(cta.props.rel, 'noopener noreferrer');
  unmount();
  const { default: Home } = await load('pages/HomePage.tsx');
  const { publicTournaments } = await load('services/publicTournaments.ts');
  const { TRIAL_REGISTRATION_URL } = await load('config/publicSite.ts');
  const homepageRequests = [];
  publicTournaments.summary = async () => ({
    total: 40,
    upcoming: 7,
    participants: 0,
    capacity: 0,
    nearest: null,
  });
  publicTournaments.list = async (params) => {
    homepageRequests.push(params);
    return {
      items: [
        {
          id: 'featured',
          title: 'Nearest club event',
          type: 'quarterly',
          date: new Date(Date.now() + 86400000).toISOString(),
          status: 'upcoming',
        },
      ],
      total: 7,
      page: 1,
      pageSize: 3,
      totalPages: 3,
    };
  };
  state.updates = {
    updates: [
      {
        id: 'configured',
        title: 'Configured news',
        content: 'Legacy content',
        description: 'Configured description',
        image: 'https://example.com/news.png',
        ctaText: 'Manager CTA',
        ctaUrl: 'https://example.com/action',
        date: '2026-10-13',
      },
    ],
    isLoading: false,
    error: null,
  };
  updatesService.getUpdates = async () => state.updates.updates;
  api.get = async (path) => ({
    data:
      path === '/api/teams/public' ? [] : { rankings: [], tournamentCount: 0 },
  });
  await mount(provided(route(el(Home))));
  assert.ok(text(renderer.toJSON()).includes('Nearest club event'));
  assert.ok(text(renderer.toJSON()).includes('Configured description'));
  assert.equal(homepageRequests[0].pageSize, 3);
  assert.equal(homepageRequests[0].type, 'quarterly');
  assert.ok(
    renderer.root
      .findAllByType('a')
      .some((link) => link.props.href === TRIAL_REGISTRATION_URL),
  );
  assert.ok(
    renderer.root
      .findAllByType('a')
      .some(
        (link) =>
          text(link) === 'Manager CTA' &&
          link.props.href === 'https://example.com/action',
      ),
  );
  unmount();
  const { default: Footer } = await load('components/layout/Footer.tsx');
  await mount(route(el(Footer)));
  assert.ok(
    renderer.root.findByType('footer').props.className.includes('text-white'),
  );
  assert.ok(
    renderer.root
      .findAllByType('a')
      .filter((link) => link.props.href !== '/')
      .every((link) => link.props.className.includes('focus-visible')),
  );
  unmount();
  // 2026.10.4: reuse the existing domain harness for presentation regressions.
  await mount(provided(route(el(PlayerEditor,{player:editFixture,onClose:()=>{},onSaved:async()=>{}}))));
  const editorForm=dialog().findByType('form');
  const orderedInputs=editorForm.findAllByType('input');
  assert.equal(orderedInputs.at(-1).props.type,'checkbox','active is the final form control');
  const dates=editorForm.findAllByProps({type:'date'});
  assert.deepEqual(dates.map(field=>field.props['aria-label']),['תאריך לידה','תאריך הצטרפות']);
  const gridParent=node=>{let parent=node.parent;while(parent&&!parent.props.className?.includes('grid'))parent=parent.parent;return parent;};
  assert.equal(gridParent(dates[0]),gridParent(dates[1]),'dates share the responsive row');
  assert.ok(editorForm.findAllByType('input').filter(field=>field.props.type!=='checkbox'&&field.props.type!=='file').every(field=>field.props.className.includes('cs-player-input')));
  const uploads=editorForm.findAllByProps({type:'file'});
  assert.equal(uploads.length,2);
  const mediaWrappers=editorForm.findAll(node=>node.type==='div'&&node.props.className==='min-w-0');
  assert.equal(mediaWrappers.length,2,'photo/deck occupy separate desktop columns');
  unmount();
  const {default:AdminPlayerTable}=await load('pages/admin/AdminPlayers.tsx');
  state.players.players=[{...editFixture,user:{username:'legacy-staff-link'}}];
  players.getPlayers=async()=>({items:state.players.players,total:1,page:1,pageSize:25,totalPages:1});
  let deleted=false;players.deletePlayer=async()=>{deleted=true;};
  await mount(provided(route(el(AdminPlayerTable),'/manage/players')));
  assert.ok(!text(renderer.toJSON()).includes('חשבון'));
  assert.ok(!text(renderer.toJSON()).includes('legacy-staff-link'),'only the display column is removed');
  for(const label of ['עריכת שחקן','מחק שחקן']){
    const iconAction=button(label);assert.equal(text(iconAction),'');assert.equal(iconAction.props.title,label);assert.ok(!iconAction.props.className.includes('shadow-button'));assert.ok(iconAction.props.className.includes('h-10'));
  }
  act(()=>button('עריכת שחקן').props.onClick());
  const playerRow=renderer.root.findAllByType('tr').find(row=>row.props.onClick);
  act(()=>playerRow.props.onClick({target:{closest:()=>button('עריכת שחקן')}}));
  assert.equal(renderer.root.findAllByType(PlayerEditor).length,1,'global management uses the canonical editor');
  assert.ok(text(renderer.toJSON()).includes('שמור שינויים'));
  act(()=>button('ביטול').props.onClick());
  await act(async()=>{button('מחק שחקן').props.onClick();await flush();});
  assert.equal(deleted,false,'icon deletion still requires confirmation');
  assert.ok(text(renderer.toJSON()).includes('ההיסטוריה תישמר'));
  act(()=>button('ביטול').props.onClick());
  unmount();
  const {AdminIndicators,JudgeIndicators,EncounterValue}=await load('features/overview/components/OverviewIndicators.tsx');
  const adminSummary={role:'admin',activeTeams:2,activeTeamPlayers:10,activeQuarterlyPlayers:7,activeTournaments:3,completedQuarterlyTournaments:12,encounterBalance:{status:'unavailable'},nearest:null};
  const {default:StatCard}=await load('components/ui/StatCard.tsx');
  await mount(route(el(AdminIndicators,{summary:adminSummary})));
  assert.deepEqual(renderer.root.findAllByType(StatCard).map(card=>card.props.label),['נבחרות פעילות','שחקני נבחרות','מפגשי נבחרות השנה','טורנירים פעילים','שחקני חוגים','טורנירים רבעוניים שהושלמו']);
  assert.ok(renderer.root.findByType('section').props.className.includes('lg:grid-cols-3'));
  assert.ok(text(renderer.toJSON()).includes('לא ניתן לטעון'));
  unmount();
  await mount(el(EncounterValue,{balance:{status:'empty',competitionYear:'2026-2027'}}));
  assert.equal(text(renderer.toJSON()),'אין נבחרות פעילות');
  unmount();
  await mount(el(EncounterValue,{balance:{status:'equal',count:3,maximum:3,competitionYear:'official-year'}}));
  assert.equal(renderer.root.findAllByType('li').length,0);assert.ok(text(renderer.toJSON()).includes('לכל נבחרת השנה'));
  unmount();
  await mount(el(EncounterValue,{balance:{status:'uneven',maximum:4,competitionYear:'official-year',lagging:[{id:'zero',name:'אפס',gap:4},{id:'partial',name:'ברק',gap:1}]}}));
  assert.deepEqual(renderer.root.findAllByType('li').map(text),['אפס — חסרים 4','ברק — חסר 1']);assert.ok(text(renderer.toJSON()).startsWith('4'));
  assert.ok(!text(renderer.toJSON()).includes('בהשוואה'));
  assert.ok(!text(renderer.toJSON()).includes('הפער במספר'));
  assert.equal(renderer.root.findAllByType('p').length,0);
  unmount();
  await mount(route(el(JudgeIndicators,{team:{...team,leaguePosition:null,completedInternalTournamentCount:2}})));
  assert.equal(renderer.root.findAllByType(StatCard).length,3);assert.ok(text(renderer.toJSON()).includes('טרם נקבע'));
  unmount();
  const {default:Overview}=await load('pages/admin/AdminOverview.tsx');
  api.get=async path=>{assert.equal(path,'/api/teams/overview');return {data:{...adminSummary,nearest:{id:'next',title:'Nearest tournament',date:'2999-01-01',managementPath:'/manage/tournaments/next'}}};};
  await mount(route(el(Overview)));
  assert.equal(renderer.root.findAllByType(StatCard).length,6);assert.ok(text(renderer.toJSON()).includes('Nearest tournament'));
  unmount();
  const {default:TeacherOverview}=await load('pages/manage/TeacherTeams.tsx');
  state.auth.user.role='judge';
  api.get=async path=>{assert.equal(path,'/api/teams/overview');return {data:{role:'judge',teams:[{...team,leaguePosition:null,openInternalTournament:{id:'open'}},{...team,id:'other',name:'אחרת',leaguePosition:null}]}};};
  await mount(provided(route(el(TeacherOverview),'/manage')));
  assert.equal(renderer.root.findAllByType(StatCard).length,6,'three metrics per assigned team');assert.equal(renderer.root.findAllByType('article').length,2,'operational team cards preserved');
  unmount();state.auth.user.role='admin';
  // Full profile hierarchy and graceful missing-media state.
  api.get=async()=>({data:{id:'v4',firstName:'לביא',lastName:'כהן',team:{id:'team',name:'נבחרת',logo:'https://example.com/team.png'},photoUrl:image.url,pokemon:['Pikachu','Iron Hands','Eevee','Mew','Pidgey','Charizard'],age:10,description:'ביוגרפיה',deckUrl:'https://example.com/deck.png',teamRanking:{position:1,points:3,tournaments:1},badges:[{name:'תג',description:'',awardedAt:'2026-10-13',icon:''}]}});
  await mount(route(el(PublicPlayer),'/all-stars/players/v4','/all-stars/players/:playerId'));
  const profileSections=renderer.root.findAllByType('section');
  assert.equal(profileSections.at(-1).props['aria-label'],'דק נוכחי');
  const pokemons=renderer.root.findByProps({'aria-label':'הפוקימונים של השחקן'});
  assert.equal(pokemons.parent.findAllByType('img')[0].props.src,image.url);
  assert.ok(pokemons.findAllByType('li').every(icon=>icon.props.className==='cs-pokemon-frame'));
  assert.equal(pokemons.findAllByType('img')[1].props.src,pokemonImageUrl('Iron Hands'));
  assert.equal(renderer.root.findAllByType('a').find(link=>link.findAllByType('img').some(img=>img.props.src==='https://example.com/team.png')).props.href,'/teams/team');
  assert.ok(pokemons.props.className.includes('cs-pokemon-row'));
  assert.ok(!pokemons.props.className.includes('flex-wrap'));
  assert.equal(pokemons.findAllByType('li').length,6);
  assert.ok(pokemons.findAllByType('img').every(icon=>!/(?:^| )(?:(?:min-)?w|h)-\d/.test(icon.props.className)));
  assert.equal(profileSections.at(-1).findByType('h2').children.join(''),'דק נוכחי');
  assert.equal(profileSections.at(-1).findByType('img').props.alt,'דק נוכחי');
  unmount();
  api.get=async()=>({data:{id:'empty',firstName:'ללא',lastName:'תמונה',team:null,teamRanking:null,badges:[]}});
  await mount(route(el(PublicPlayer),'/all-stars/players/empty','/all-stars/players/:playerId'));
  assert.ok(renderer.root.findByProps({'aria-label':'אין תמונת שחקן'}));assert.equal(renderer.root.findAllByType('img').length,0);assert.equal(renderer.root.findAllByProps({'aria-label':'דק נוכחי'}).length,0);
  unmount();
  const {readFile}=await import('node:fs/promises');
  const css=await readFile('src/index.css','utf8');
  const luminance=hex=>{const channels=hex.match(/[a-f0-9]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;};
  const background=css.match(/--cs-navy: #(\w{6})/)[1];const foreground=css.match(/--cs-white: #(\w{6})/)[1];
  assert.ok((luminance(foreground)+0.05)/(luminance(background)+0.05)>=4.5,'shared header tokens meet WCAG AA');
  assert.ok(css.includes('.cs-management thead')&&css.includes('--table-header-foreground: var(--cs-white)'));
  assert.ok(css.includes('.cs-management thead button:focus-visible'));
  const rowRules=css.match(/\.cs-pokemon-row\s*\{([^}]+)\}/)[1];
  const frameRules=css.match(/\.cs-pokemon-frame\s*\{([^}]+)\}/)[1];
  const imageRules=css.match(/\.cs-pokemon-frame img\s*\{([^}]+)\}/)[1];
  assert.ok(rowRules.includes('flex-wrap: nowrap')&&rowRules.includes('width: 100%'));
  assert.ok(frameRules.includes('flex: 0 1 3rem'));
  for(const rules of [frameRules,imageRules]){
    assert.ok(rules.includes('min-width: 0')&&rules.includes('min-height: 0'));
    assert.ok(!/min-(?:width|height):\s*[1-9]/.test(rules));
  }
  assert.ok(!/overflow[^:]*:\s*(?:auto|scroll|hidden)/.test(rowRules),'fit without scrolling or clipping');
  console.log('2026.10.6 UI checks passed: compact maximum/gap list, six shrinkable no-wrap Pokémon, current-deck labels and retained empty/equal/error states.');
  console.log('2026.10.4 UI checks passed: icon actions, shared field order/heights/media columns, role-specific KPI order/availability/balance, preserved operation cards and image-first profile with deck last.');
  console.log(
    '2026.10.3 UI checks passed: shared bounded player/team editors, team-only fields, Pokémon/deck/join date, team logo/admin actions, paginated request transitions and News validation/CTA.',
  );
  console.log(
    '2026.10.2 UI checks passed: authenticated presign/direct upload/verification, preview/busy/error/removal, unified canonical ranking including unranked members, optional team photos and regular city boundaries and biography/birth management, generic team/badge uploads, Season-aware badge display and confirmed revocation/Season deletion.',
  );
} finally {
  axios.post = originalAxiosPost;
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}
