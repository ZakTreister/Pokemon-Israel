import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const element = React.createElement;
try {
  const load = (file) => vite.ssrLoadModule(`/src/${file}`);
  const { selectLegacyTournamentList } = await load(
    'features/tournaments/utils/legacyTournamentList.ts',
  );
  const now = new Date('2026-10-07T12:00:00Z');
  const tournaments = [
    {
      id: 'future',
      title: 'League',
      description: 'Club event',
      location: 'Haifa',
      date: '2026-10-09T12:00:00Z',
      status: 'upcoming',
    },
    {
      id: 'past',
      title: 'Older',
      description: 'League results',
      location: 'Tel Aviv',
      date: '2026-10-01T12:00:00Z',
      status: 'upcoming',
    },
    {
      id: 'closed',
      title: 'Closed',
      description: '',
      location: 'Haifa',
      date: '2026-10-08T12:00:00Z',
      status: 'completed',
    },
    {
      id: 'boundary',
      title: 'Today',
      description: '',
      location: '',
      date: now.toISOString(),
      status: 'upcoming',
    },
  ];
  const original = structuredClone(tournaments);
  assert.deepEqual(
    selectLegacyTournamentList(tournaments, '', 'all', now).map((t) => t.id),
    ['past', 'boundary', 'closed', 'future'],
  );
  assert.deepEqual(
    selectLegacyTournamentList(tournaments, '', 'upcoming', now).map(
      (t) => t.id,
    ),
    ['boundary', 'future'],
  );
  assert.deepEqual(
    selectLegacyTournamentList(tournaments, 'LEAGUE', 'completed', now).map(
      (t) => t.id,
    ),
    ['past'],
  );
  assert.deepEqual(
    selectLegacyTournamentList(tournaments, 'HAIFA', 'all', now).map(
      (t) => t.id,
    ),
    ['closed', 'future'],
  );
  assert.deepEqual(selectLegacyTournamentList([], '', 'all', now), []);
  assert.deepEqual(
    selectLegacyTournamentList(tournaments, 'missing', 'all', now),
    [],
  );
  assert.deepEqual(
    tournaments,
    original,
    'Display status/sorting must never mutate Redux records',
  );

  const { participantOptions } = await load(
    'features/tournaments/utils/participantOptions.ts',
  );
  const participants = [
    { player: 'present', nameSnapshot: 'שם בטורניר' },
    { player: 'absent', nameSnapshot: 'חסר בסגל' },
  ];
  const roster = [
    { id: 'present', firstName: 'שם', lastName: 'מעודכן' },
    { id: 'additional', firstName: 'ילד', lastName: 'נוסף' },
  ];
  const options = participantOptions(participants, roster);
  assert.deepEqual(options, [
    { id: 'present', label: 'שם בטורניר' },
    { id: 'absent', label: 'חסר בסגל' },
    { id: 'additional', label: 'ילד נוסף' },
  ]);
  assert.deepEqual(participantOptions([], []), []);

  const { default: ParticipantList } = await load(
    'features/tournaments/components/ParticipantList.tsx',
  );
  let selected = ['present'];
  function Attendance() {
    const [value, setValue] = React.useState(selected);
    return element(ParticipantList, {
      options,
      selected: value,
      disabled: false,
      onChange: (next) => {
        selected = next;
        setValue(next);
      },
    });
  }
  let attendance;
  await act(async () => {
    attendance = TestRenderer.create(element(Attendance));
  });
  const inputs = () => attendance.root.findAllByType('input');
  assert.equal(inputs()[0].props.checked, true);
  await act(async () => {
    inputs()[0].props.onChange({ target: { checked: false } });
  });
  assert.deepEqual(selected, []);
  await act(async () => {
    inputs()[2].props.onChange({ target: { checked: true } });
  });
  assert.deepEqual(selected, ['additional']);
  await act(async () => {
    attendance.update(
      element(ParticipantList, {
        options,
        selected,
        disabled: true,
        onChange() {},
      }),
    );
  });
  assert.ok(inputs().every((input) => input.props.disabled));
  await act(async () => attendance.unmount());

  const { default: FormField } = await load('components/ui/FormField.tsx');
  let field;
  await act(async () => {
    field = TestRenderer.create(
      element(
        FormField,
        {
          label: 'שם',
          htmlFor: 'name',
          required: true,
          description: 'שם מלא',
          error: 'נדרש שם',
        },
        element('input', { id: 'name', 'aria-describedby': 'existing-help' }),
      ),
    );
  });
  const control = field.root.findByType('input');
  assert.equal(control.props['aria-invalid'], true);
  assert.equal(
    control.props['aria-describedby'],
    [
      'existing-help',
      ...field.root.findAllByType('p').map((p) => p.props.id),
    ].join(' '),
  );
  assert.equal(
    field.root.findByProps({ role: 'alert' }).children.join(''),
    'נדרש שם',
  );
  assert.equal(field.root.findByType('label').children.join(''), 'שם *');
  await act(async () => {
    field.update(
      element(
        FormField,
        { label: 'שם', htmlFor: 'name' },
        element('input', { id: 'name' }),
      ),
    );
  });
  assert.equal(field.root.findByType('input').props['aria-invalid'], undefined);
  assert.equal(
    field.root.findByType('input').props['aria-describedby'],
    undefined,
  );
  await act(async () => field.unmount());

  const { default: PlayerNameFields } = await load(
    'features/players/components/PlayerNameFields.tsx',
  );
  let changed;
  let fields;
  await act(async () => {
    fields = TestRenderer.create(
      element(PlayerNameFields, {
        firstName: 'ראשון',
        lastName: 'משפחה',
        onChange: (...args) => {
          changed = args;
        },
      }),
    );
  });
  const names = fields.root.findAllByType('input');
  assert.deepEqual(
    names.map((input) => input.props.value),
    ['ראשון', 'משפחה'],
  );
  assert.deepEqual(
    fields.root.findAllByType('label').map((label) => label.props.htmlFor),
    names.map((input) => input.props.id),
  );
  names[1].props.onChange({ target: { value: 'עדכון' } });
  assert.deepEqual(changed, ['lastName', 'עדכון']);
  await act(async () => fields.unmount());

  const { default: Modal } = await load('components/ui/Modal.tsx');
  let closed = 0;
  let modal;
  await act(async () => {
    modal = TestRenderer.create(
      element(
        Modal,
        {
          title: 'כותרת',
          onClose: () => {
            closed++;
          },
          closeVariant: 'ghost',
        },
        element('input', { value: 'draft', readOnly: true }),
      ),
    );
  });
  assert.equal(
    modal.root.findByProps({ role: 'dialog' }).props['aria-labelledby'],
    modal.root.findByType('h3').props.id,
  );
  assert.equal(modal.root.findByType('input').props.value, 'draft');
  const close = modal.root.findByType('button');
  assert.equal(close.props['aria-label'], 'סגור');
  close.props.onClick();
  assert.equal(closed, 1);
  await act(async () => {
    modal.update(
      element(
        Modal,
        {
          title: 'תוצאות',
          panelClassName: 'max-w-6xl max-h-[90vh] overflow-y-auto',
        },
        'content',
      ),
    );
  });
  assert.equal(
    modal.root.findAllByType('button').length,
    0,
    'Results dialog must retain its existing footer-only dismissal',
  );
  assert.match(
    modal.root.findByProps({ role: 'dialog' }).props.className,
    /max-w-6xl max-h-\[90vh\] overflow-y-auto/,
  );
  await act(async () => modal.unmount());

  const { default: TournamentStandings } = await load(
    'features/tournaments/components/TournamentStandings.tsx',
  );
  let standings;
  await act(async () => {
    standings = TestRenderer.create(
      element(TournamentStandings, {
        rows: [
          {
            player: 'p',
            playerName: 'שחקן',
            position: 1,
            points: 3,
            omp: null,
            gwp: 1 / 3,
            ogp: 0,
          },
        ],
      }),
    );
  });
  assert.deepEqual(
    standings.root.findAllByType('td').map((cell) => cell.children.join('')),
    ['1', 'שחקן', '3', '—', '33.33%', '0.00%'],
  );
  assert.ok(standings.root.findAllByProps({ dir: 'ltr' }).length === 3);
  await act(async () => standings.unmount());
  console.log(
    'Frontend refactor checks passed: immutable legacy list rules, participant snapshots/selection, player fields, modal dismissal and standings formatting.',
  );
} finally {
  await vite.close();
}
