#!/usr/bin/env node
// Local spec progress dashboard (no Plane.so required).
// Parses docs/specs/*.md: frontmatter `status` + checkbox tally.

const fs = require('fs');
const path = require('path');

const SPECS_DIR = path.join(__dirname, '..', 'docs', 'specs');
const VALID_STATUSES = ['draft', 'in-progress', 'done', 'archived'];

const STATUS_LABELS = {
  'draft': '📝 draft',
  'in-progress': '🔶 in-progress',
  'done': '🟢 done',
  'archived': '⚪ archived',
  '(sin status)': '⚠️  (sin status)'
};

function parseSpec(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/);

  let title = path.basename(filePath);
  let status = null;
  const fmEnd = lines[0].trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1;
  if (fmEnd > -1) {
    for (const line of lines.slice(1, fmEnd)) {
      const t = line.match(/^title:\s*"?(.+?)"?\s*$/);
      if (t) title = t[1];
      const s = line.match(/^status:\s*(\S+)/);
      if (s) status = s[1];
    }
  }

  let done = 0;
  let total = 0;
  const pending = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\s*- \[( |x)\]\s+(.+)/i);
    if (!m) return;
    total += 1;
    if (m[1].toLowerCase() === 'x') done += 1;
    else pending.push({ line: i + 1, text: m[2].trim() });
  });

  return { file: path.basename(filePath), title, status, done, total, pending };
}

function main() {
  const failIncomplete = process.argv.includes('--fail-incomplete');
  const files = fs.readdirSync(SPECS_DIR)
    .filter((f) => /^spec-.*\.md$/.test(f))
    .sort();

  const specs = files.map((f) => parseSpec(path.join(SPECS_DIR, f)));

  const nameWidth = Math.max(4, ...specs.map((s) => s.file.length));
  console.log('\n📊 Progreso de specs locales (docs/specs/)\n');
  console.log(
    `${'Spec'.padEnd(nameWidth)}  ${'Status'.padEnd(16)}  ${'Tareas'.padEnd(8)}  %`
  );
  console.log('-'.repeat(nameWidth + 36));

  let activeDone = 0;
  let activeTotal = 0;
  let problems = 0;

  for (const s of specs) {
    const isArchived = s.status === 'archived';
    const pct = s.total === 0 ? '-' : `${Math.round((s.done / s.total) * 100)}%`;
    const tally = isArchived ? '-' : `${s.done}/${s.total}`;
    const statusKey = s.status || '(sin status)';
    const label = STATUS_LABELS[statusKey] || `❓ ${statusKey}`;
    console.log(
      `${s.file.padEnd(nameWidth)}  ${label.padEnd(16)}  ${tally.padEnd(8)}  ${pct}${isArchived ? '  (excluida del total)' : ''}`
    );

    if (!isArchived) {
      activeDone += s.done;
      activeTotal += s.total;
    }

    if (s.status && !VALID_STATUSES.includes(s.status)) {
      console.log(`   ⚠️  status inválido: "${s.status}" (usa: ${VALID_STATUSES.join(', ')})`);
      problems += 1;
    }
    if (!s.status && !isArchived) problems += 1;
    if (!isArchived && s.done < s.total && s.status === 'done') {
      console.log(`   ⚠️  status dice "done" pero quedan ${s.total - s.done} checkboxes abiertos`);
      problems += 1;
    }
  }

  console.log('-'.repeat(nameWidth + 36));
  const overallPct = activeTotal === 0 ? 0 : Math.round((activeDone / activeTotal) * 100);
  console.log(`TOTAL: ${activeDone}/${activeTotal} tareas completadas (${overallPct}%)\n`);

  if (failIncomplete) {
    const incomplete = specs.filter(
      (s) => s.status !== 'archived' && s.done < s.total
    );
    if (incomplete.length > 0) {
      console.log('❌ Specs con tareas pendientes:');
      for (const s of incomplete) {
        console.log(`   ${s.file}: ${s.total - s.done} pendientes`);
        for (const p of s.pending.slice(0, 3)) {
          console.log(`      L${p.line}: ${p.text}`);
        }
        if (s.pending.length > 3) console.log(`      … y ${s.pending.length - 3} más`);
      }
      console.log('');
      process.exit(1);
    }
    console.log('✅ Todas las specs activas tienen sus checkboxes completos.\n');
  }

  if (problems > 0) {
    console.log(`⚠️  ${problems} spec(s) con status ausente/inválido. Ver convención en docs/rules.md\n`);
  }
}

// crude CJK/emoji width compensation is unnecessary for terminal alignment
function widthFix() { return 0; }

main();
