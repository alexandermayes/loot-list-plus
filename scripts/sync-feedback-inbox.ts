#!/usr/bin/env tsx
/**
 * Pulls all open `user-feedback` issues from GitHub and writes a single
 * markdown digest to `feedback/inbox.md`. Splits the list by source so
 * triage shows in-app vs Discord-captured separately.
 *
 * Run: `npm run sync:feedback`
 *
 * Requires the `gh` CLI to be installed and authenticated.
 * The output file is gitignored — regenerate on demand.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUTPUT_PATH = 'feedback/inbox.md';
const LABEL = 'user-feedback';
const LIMIT = 200;

type Issue = {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  createdAt: string;
  url: string;
  author?: { login: string } | null;
};

function fetchIssues(): Issue[] {
  const cmd = `gh issue list --label ${LABEL} --state open --limit ${LIMIT} --json number,title,body,labels,createdAt,url,author`;
  const out = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(out);
}

function isDiscordSource(issue: Issue): boolean {
  return issue.labels.some((l) => l.name === 'discord-source');
}

function snippet(body: string, max = 240): string {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max) + '…';
}

function formatIssue(issue: Issue): string {
  const date = issue.createdAt.slice(0, 10);
  const author = issue.author?.login ?? 'unknown';
  return [
    `### #${issue.number} — ${issue.title}`,
    `Filed: ${date} · Reporter: @${author}`,
    `Link: ${issue.url}`,
    '',
    `> ${snippet(issue.body || '(no body)')}`,
    '',
  ].join('\n');
}

function buildMarkdown(issues: Issue[]): string {
  const discord = issues.filter(isDiscordSource);
  const inApp = issues.filter((i) => !isDiscordSource(i));
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const sections = [
    `# User Feedback Inbox`,
    ``,
    `Generated: ${now}`,
    `Open total: **${issues.length}** (${discord.length} Discord, ${inApp.length} in-app)`,
    ``,
    `---`,
    ``,
    `## Discord-sourced (${discord.length})`,
    ``,
    discord.length === 0 ? '_None._' : discord.map(formatIssue).join('\n'),
    ``,
    `## In-app feedback (${inApp.length})`,
    ``,
    inApp.length === 0 ? '_None._' : inApp.map(formatIssue).join('\n'),
  ];

  return sections.join('\n');
}

function main() {
  console.log(`Fetching open issues labeled "${LABEL}"...`);
  const issues = fetchIssues();
  console.log(`Found ${issues.length} open issue(s).`);

  const md = buildMarkdown(issues);
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, md);

  console.log(`✓ Wrote ${OUTPUT_PATH}`);
}

main();
