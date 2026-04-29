#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';

// ── Paths ───────────────────────────────────────────────────────────

const PIPELINE_PATH = 'data/pipeline.md';
const OUTPUT_DIR = 'output';

// ── Setup ───────────────────────────────────────────────────────────

mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Helpers ─────────────────────────────────────────────────────────

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parsePipelineJobs(markdown) {
  const jobs = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const match = line.match(/^- \[ \] (.+?) \| (.+?) \| (.+)$/);
    if (!match) continue;

    const url = match[1].trim();
    const company = match[2].trim();
    const role = match[3].trim();

    jobs.push({
      url,
      company,
      role,
      location: '',
    });
  }

  return jobs;
}

function detectArchetype(role) {
  const lower = role.toLowerCase();

  if (lower.includes('product') && lower.includes('analytic')) {
    return 'Product / Growth / Customer Analytics';
  }
  if (lower.includes('growth')) {
    return 'Product / Growth / Customer Analytics';
  }
  if (lower.includes('business analyst') || lower.includes('operations analyst')) {
    return 'Business Analyst / Operations Analyst';
  }
  if (lower.includes('analytics engineer') || lower.includes('bi engineer') || lower.includes('business intelligence engineer')) {
    return 'Analytics Engineer / BI Developer';
  }
  if (lower.includes('data scientist') || lower.includes('data science') || lower.includes('ml')) {
    return 'Applied Data Scientist / ML Analyst';
  }
  if (lower.includes('strategy')) {
    return 'Strategy & Analytics / Consulting';
  }
  if (lower.includes('analyst') || lower.includes('analytics') || lower.includes('business intelligence') || lower.includes('bi')) {
    return 'Data Analyst / BI Analyst';
  }

  return 'Unclear';
}

function detectFunctionFit(role) {
  const lower = role.toLowerCase();

  if (
    lower.includes('data analyst') ||
    lower.includes('business analyst') ||
    lower.includes('operations analyst') ||
    lower.includes('product analyst') ||
    lower.includes('analytics') ||
    lower.includes('business intelligence') ||
    lower.includes('bi engineer') ||
    lower.includes('analytics engineer')
  ) {
    return 4.5;
  }

  if (
    lower.includes('data scientist') ||
    lower.includes('forecast') ||
    lower.includes('decision science') ||
    lower.includes('strategy')
  ) {
    return 4.0;
  }

  return 2.5;
}

function detectSeniorityFit(role) {
  const lower = role.toLowerCase();

  if (lower.includes('head') || lower.includes('director') || lower.includes('principal') || lower.includes('staff')) {
    return 2.0;
  }

  if (lower.includes('senior')) {
    return 3.0;
  }

  return 4.5;
}

function detectSkillsFit(role) {
  const lower = role.toLowerCase();

  if (
    lower.includes('analyst') ||
    lower.includes('analytics') ||
    lower.includes('strategy') ||
    lower.includes('forecast') ||
    lower.includes('business intelligence')
  ) {
    return 4.0;
  }

  if (lower.includes('data scientist')) {
    return 3.5;
  }

  return 2.5;
}

function detectAuthorizationSafety(job) {
  const combined = `${job.role} ${job.location} ${job.url}`.toLowerCase();

  const blockedPatterns = [
    /u\.?s\.?\s+citizen/,
    /citizenship/,
    /green\s+card/,
    /permanent\s+resident/,
    /no\s+sponsorship/,
    /unrestricted\s+work\s+authorization/,
    /export\s+control/,
    /\bitar\b/,
    /\bear\b/,
    /security\s+clearance/,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(combined)) {
      return 1.0;
    }
  }

  return 4.5;
}

function detectConversionLikelihood(role) {
  const lower = role.toLowerCase();

  if (
    lower.includes('analyst') ||
    lower.includes('analytics') ||
    lower.includes('business analyst') ||
    lower.includes('product analyst') ||
    lower.includes('operations analyst')
  ) {
    return 4.0;
  }

  if (lower.includes('senior') || lower.includes('data scientist')) {
    return 3.2;
  }

  if (lower.includes('head') || lower.includes('director') || lower.includes('staff')) {
    return 2.0;
  }

  return 3.0;
}

function averageScore(scores) {
  const total = scores.reduce((sum, x) => sum + x, 0);
  return Number((total / scores.length).toFixed(2));
}

function recommendationFromScore(score) {
  if (score >= 4.4) return 'APPLY HIGH';
  if (score >= 3.8) return 'APPLY';
  if (score >= 3.2) return 'MAYBE';
  if (score >= 2.8) return 'LOW PRIORITY';
  return 'NO APPLY';
}

function summarizeReasons(job, archetype, functionFit, seniorityFit, skillsFit, authFit, conversionFit) {
  const reasons = [];
  const risks = [];

  reasons.push(`Archetype fit: ${archetype}`);

  if (functionFit >= 4.0) reasons.push('Strong target-function alignment');
  if (skillsFit >= 4.0) reasons.push('Role likely values analytics and business data skills');
  if (conversionFit >= 4.0) reasons.push('Reasonable use of application time');

  if (seniorityFit <= 3.0) risks.push('Some seniority stretch');
  if (authFit <= 2.0) risks.push('Authorization or compliance risk detected');
  if (functionFit < 3.0) risks.push('Weak target-function alignment');

  if (risks.length === 0) risks.push('No major early red flag found');

  return { reasons: reasons.slice(0, 3), risks: risks.slice(0, 2) };
}

function rankJobs(jobs) {
  const ranked = jobs.map((job) => {
    const archetype = detectArchetype(job.role);
    const functionFit = detectFunctionFit(job.role);
    const seniorityFit = detectSeniorityFit(job.role);
    const skillsFit = detectSkillsFit(job.role);
    const authorizationSafety = detectAuthorizationSafety(job);
    const conversionLikelihood = detectConversionLikelihood(job.role);

    const score = averageScore([
      functionFit,
      seniorityFit,
      skillsFit,
      authorizationSafety,
      conversionLikelihood,
    ]);

    const recommendation = recommendationFromScore(score);
    const { reasons, risks } = summarizeReasons(
      job,
      archetype,
      functionFit,
      seniorityFit,
      skillsFit,
      authorizationSafety,
      conversionLikelihood
    );

    return {
      ...job,
      archetype,
      function_fit: functionFit,
      seniority_fit: seniorityFit,
      skills_fit: skillsFit,
      authorization_safety: authorizationSafety,
      conversion_likelihood: conversionLikelihood,
      score,
      recommendation,
      top_reasons: reasons,
      top_risks: risks,
      key_reason: reasons[0] || '',
      main_risk: risks[0] || '',
      authorization_note: authorizationSafety <= 2.0 ? 'Potential authorization risk' : 'No obvious early authorization blocker',
    };
  });

  const kept = ranked
    .filter((job) => ['MAYBE', 'APPLY', 'APPLY HIGH'].includes(job.recommendation))
    .sort((a, b) => {
      const tierOrder = { 'APPLY HIGH': 3, 'APPLY': 2, 'MAYBE': 1 };
      const tierDiff = (tierOrder[b.recommendation] || 0) - (tierOrder[a.recommendation] || 0);
      if (tierDiff !== 0) return tierDiff;
      if (b.score !== a.score) return b.score - a.score;
      if (b.authorization_safety !== a.authorization_safety) return b.authorization_safety - a.authorization_safety;
      if (b.function_fit !== a.function_fit) return b.function_fit - a.function_fit;
      return b.conversion_likelihood - a.conversion_likelihood;
    })
    .map((job, index) => ({
      rank: index + 1,
      ...job,
    }));

  return kept;
}

function writeCsv(path, rows) {
  const headers = [
    'rank',
    'company',
    'role',
    'location',
    'url',
    'archetype',
    'score',
    'recommendation',
    'key_reason',
    'main_risk',
    'authorization_note',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(',')
    ),
  ];

  writeFileSync(path, lines.join('\n'), 'utf-8');
}

function writeJson(path, rows) {
  writeFileSync(path, JSON.stringify(rows, null, 2), 'utf-8');
}

// ── Main ────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(PIPELINE_PATH)) {
    console.error(`Error: ${PIPELINE_PATH} not found.`);
    process.exit(1);
  }

  const pipelineText = readFileSync(PIPELINE_PATH, 'utf-8');
  const jobs = parsePipelineJobs(pipelineText);

  if (jobs.length === 0) {
    console.log('No pending jobs found in pipeline.md.');
    return;
  }

  const ranked = rankJobs(jobs);
  const date = todayString();

  const csvPath = `${OUTPUT_DIR}/rank-${date}.csv`;
  const jsonPath = `${OUTPUT_DIR}/rank-${date}.json`;

  writeCsv(csvPath, ranked);
  writeJson(jsonPath, ranked);

  console.log(`Ranked ${jobs.length} jobs.`);
  console.log(`Kept ${ranked.length} jobs rated MAYBE or above.`);
  console.log(`CSV written to: ${csvPath}`);
  console.log(`JSON written to: ${jsonPath}`);

  if (ranked.length > 0) {
    console.log('\nTop ranked jobs:');
    for (const job of ranked.slice(0, 10)) {
      console.log(
        `${job.rank}. ${job.company} | ${job.role} | ${job.score}/5 | ${job.recommendation}`
      );
    }
  }
}

main();
