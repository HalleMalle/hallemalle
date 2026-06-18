import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  GithubAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";

import { auth, db, isFirebaseConfigured } from "./firebase";

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 20;
const BIO_MAX_LENGTH = 200;
const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const PORTFOLIO_SYNC_MONTHS = 12;
const GITHUB_CONTRIBUTION_REPOSITORY_LIMIT = 50;
const GITHUB_REPOSITORY_COMMIT_LIMIT = 100;
const GITHUB_TOTAL_COMMIT_DETAIL_LIMIT = 500;
const GITHUB_COMMIT_DETAIL_CONCURRENCY = 4;
const GITHUB_MANIFEST_FETCH_REPOSITORY_LIMIT = 30;
const GITHUB_MANIFEST_PATHS = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "go.mod",
  "pubspec.yaml",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "firebase.json",
  ".firebaserc",
  "serverless.yml",
  "serverless.yaml",
  "template.yaml",
  "app.json",
  "app.config.js",
  "app.config.ts",
  "metro.config.js",
  "react-native.config.js",
];
const GITHUB_IGNORED_PATH_SEGMENTS = new Set([
  "node_modules",
  "vendor",
  "dist",
  "build",
  ".next",
  "coverage",
  ".cache",
  "target",
  "out",
]);
const GITHUB_IGNORED_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
  "poetry.lock",
  "pipfile.lock",
  "gemfile.lock",
]);
const GITHUB_IGNORED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "pdf",
  "zip",
  "gz",
  "tar",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "mp4",
  "mov",
  "mp3",
  "wav",
]);
const GITHUB_LANGUAGE_BY_EXTENSION = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  html: "HTML",
  htm: "HTML",
  py: "Python",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  swift: "Swift",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  cs: "C#",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  php: "PHP",
  dart: "Dart",
  scala: "Scala",
  r: "R",
  sql: "SQL",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  ps1: "PowerShell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  md: "Markdown",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  dockerfile: "Dockerfile",
};
const FRAMEWORK_DETECTORS = [
  {
    name: "React.js",
    weight: 8,
    patterns: [
      /(^|\/)package\.json$/,
      /\.(jsx|tsx)$/,
      /(^|\/)src\/components\//,
    ],
    tokens: ["react", "react-dom", "@vitejs/plugin-react"],
  },
  {
    name: "Next.js",
    weight: 9,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)next\.config\.(js|mjs|ts)$/,
      /(^|\/)app\/.*\.(js|jsx|ts|tsx)$/,
      /(^|\/)pages\/.*\.(js|jsx|ts|tsx)$/,
    ],
    tokens: ["next"],
  },
  {
    name: "Vue.js",
    weight: 8,
    patterns: [
      /(^|\/)package\.json$/,
      /\.vue$/,
      /(^|\/)src\/components\//,
    ],
    tokens: ["vue", "@vue/cli", "@vitejs/plugin-vue"],
  },
  {
    name: "Nuxt.js",
    weight: 9,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)nuxt\.config\.(js|mjs|ts)$/,
      /(^|\/)pages\/.*\.vue$/,
      /(^|\/)app\.vue$/,
    ],
    tokens: ["nuxt", "@nuxt/"],
  },
  {
    name: "Node.js",
    weight: 6,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)server\.(js|ts|mjs)$/,
      /(^|\/)src\/server\//,
    ],
    tokens: ["node", "express", "fastify", "nestjs", "@nestjs/core"],
  },
  {
    name: "Express",
    weight: 8,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)server\.(js|ts|mjs)$/,
      /(^|\/)app\.(js|ts|mjs)$/,
    ],
    tokens: ["express"],
  },
  {
    name: "NestJS",
    weight: 9,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)nest-cli\.json$/,
      /(^|\/)src\/main\.(js|ts)$/,
    ],
    tokens: ["@nestjs/core", "@nestjs/common", "@nestjs/platform-express", "nestjs"],
  },
  {
    name: "SpringBoot",
    weight: 10,
    patterns: [
      /(^|\/)pom\.xml$/,
      /(^|\/)build\.gradle(\.kts)?$/,
      /src\/main\/java\//,
      /src\/main\/kotlin\//,
    ],
    tokens: ["spring-boot", "springframework.boot", "spring-boot-starter"],
  },
  {
    name: "FastAPI",
    weight: 10,
    patterns: [
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /(^|\/)main\.py$/,
      /(^|\/)app\/main\.py$/,
    ],
    tokens: ["fastapi", "uvicorn"],
  },
  {
    name: "Django",
    weight: 10,
    patterns: [
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /(^|\/)manage\.py$/,
      /(^|\/)settings\.py$/,
    ],
    tokens: ["django", "djangorestframework"],
  },
  {
    name: "Flutter",
    weight: 10,
    patterns: [
      /(^|\/)pubspec\.yaml$/,
      /(^|\/)lib\/.*\.dart$/,
      /(^|\/)android\/app\/build\.gradle$/,
      /(^|\/)ios\/runner\//,
    ],
    tokens: ["flutter", "flutter_test", "cupertino_icons"],
  },
  {
    name: "React Native",
    weight: 6,
    requiresStrongPathMatch: true,
    patterns: [
      /(^|\/)metro\.config\.(js|cjs|mjs|ts)$/,
      /(^|\/)react-native\.config\.(js|cjs|mjs|ts)$/,
      /(^|\/)app\.json$/,
      /(^|\/)app\.config\.(js|ts)$/,
      /\.(ios|android)\.(js|jsx|ts|tsx)$/,
      /(^|\/)index\.(ios|android)\.(js|jsx|ts|tsx)$/,
      /(^|\/)android\/app\/src\/main\/androidmanifest\.xml$/,
      /(^|\/)ios\/[^/]+\.xcodeproj\//,
    ],
    tokens: ["react-native", "@react-native/", "expo", "metro"],
  },
  {
    name: "MySQL",
    weight: 7,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /(^|\/)pom\.xml$/,
      /(^|\/)build\.gradle(\.kts)?$/,
      /\.sql$/,
    ],
    tokens: ["mysql", "mysql2", "pymysql", "mysqlclient", "mysql-connector", "mariadb"],
  },
  {
    name: "PostgreSQL",
    weight: 7,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /(^|\/)pom\.xml$/,
      /(^|\/)build\.gradle(\.kts)?$/,
      /\.sql$/,
    ],
    tokens: ["postgresql", "postgres", "psycopg2", "asyncpg", "pg-native", "org.postgresql"],
  },
  {
    name: "MongoDB",
    weight: 7,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /(^|\/)pom\.xml$/,
      /(^|\/)build\.gradle(\.kts)?$/,
    ],
    tokens: ["mongodb", "mongoose", "pymongo", "motor", "mongoengine"],
  },
  {
    name: "Redis",
    weight: 7,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /(^|\/)pom\.xml$/,
      /(^|\/)build\.gradle(\.kts)?$/,
    ],
    tokens: ["redis", "ioredis", "lettuce", "jedis", "redisson"],
  },
  {
    name: "AWS",
    weight: 7,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /(^|\/)pom\.xml$/,
      /(^|\/)build\.gradle(\.kts)?$/,
      /(^|\/)serverless\.ya?ml$/,
      /(^|\/)template\.ya?ml$/,
    ],
    tokens: ["aws-sdk", "@aws-sdk/", "boto3", "botocore", "software.amazon.awssdk", "amazonaws", "serverless"],
  },
  {
    name: "Docker",
    weight: 8,
    patterns: [
      /(^|\/)dockerfile$/,
      /(^|\/)docker-compose\.ya?ml$/,
      /(^|\/)\.dockerignore$/,
    ],
    tokens: ["docker", "docker-compose", "container_name", "image:"],
  },
  {
    name: "Firebase",
    weight: 8,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)firebase\.json$/,
      /(^|\/)\.firebaserc$/,
      /(^|\/)firestore\.rules$/,
    ],
    tokens: ["firebase", "firebase-admin", "firebase-functions", "@angular/fire"],
  },
  {
    name: "Figma",
    weight: 5,
    patterns: [
      /(^|\/)package\.json$/,
      /(^|\/)manifest\.json$/,
    ],
    tokens: ["figma", "@figma/plugin-typings", "figma-plugin-ds"],
  },
  {
    name: "PyTorch",
    weight: 9,
    patterns: [
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /\.ipynb$/,
      /(^|\/)models?\//,
    ],
    tokens: ["torch", "pytorch", "torchvision", "torchaudio"],
  },
  {
    name: "TensorFlow",
    weight: 9,
    patterns: [
      /(^|\/)requirements\.txt$/,
      /(^|\/)pyproject\.toml$/,
      /\.ipynb$/,
      /(^|\/)models?\//,
    ],
    tokens: ["tensorflow", "keras"],
  },
];

function createProfileError(code, message) {
  const error = new Error(message);
  error.code = code;

  return error;
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw createProfileError(
      "PROF-CONFIG-MISSING",
      "Firebase 설정 후 프로필 기능을 사용할 수 있어요.",
    );
  }
}

function assertAuthenticatedUser(uid, code) {
  if (!uid) {
    throw createProfileError(code, "로그인이 필요한 기능입니다.");
  }
}

function normalizeDisplayName(displayName) {
  return String(displayName ?? "").trim();
}

function validateDisplayName(displayName) {
  const normalizedDisplayName = normalizeDisplayName(displayName);

  if (
    normalizedDisplayName.length < DISPLAY_NAME_MIN_LENGTH ||
    normalizedDisplayName.length > DISPLAY_NAME_MAX_LENGTH ||
    /\s/.test(normalizedDisplayName)
  ) {
    throw createProfileError("PROF-002-INVALID-FORMAT", "사용자명 형식을 확인해주세요.");
  }

  return normalizedDisplayName;
}

function normalizeBio(bio) {
  return String(bio ?? "").trim();
}

function validateBio(bio) {
  const normalizedBio = normalizeBio(bio);

  if (normalizedBio.length > BIO_MAX_LENGTH) {
    throw createProfileError("PROF-003-INVALID-BIO", "소개는 200자 이내로 입력해주세요.");
  }

  return normalizedBio;
}

function assertGithubLinked(profileData) {
  if (!profileData.github_login) {
    throw createProfileError("PORT-002-GITHUB-NOT-LINKED", "GitHub 계정 연결이 필요합니다.");
  }
}

function createGithubApiUrl(path) {
  return `${GITHUB_API_BASE_URL}${path}`;
}

async function getGithubAccessToken() {
  if (!auth.currentUser) {
    throw createProfileError("PORT-002-UNAUTHENTICATED", "로그인이 필요한 기능입니다.");
  }

  const provider = new GithubAuthProvider();
  provider.addScope("read:user");
  provider.addScope("user:email");
  provider.addScope("repo");

  const result = await reauthenticateWithPopup(auth.currentUser, provider);
  const credential = GithubAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw createProfileError(
      "PORT-002-TOKEN-MISSING",
      "GitHub 접근 권한을 확인하지 못했습니다.",
    );
  }

  return credential.accessToken;
}

async function fetchGithubGraphql(query, variables, accessToken) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 403) {
    throw createProfileError(
      "PORT-002-RATE-LIMITED",
      "GitHub 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  if (!response.ok) {
    throw createProfileError(
      "PORT-002-PROVIDER-UNAVAILABLE",
      "GitHub 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    throw createProfileError(
      "PORT-002-GRAPHQL-FAILED",
      payload.errors[0]?.message || "GitHub GraphQL 요청을 처리하지 못했습니다.",
    );
  }

  return payload.data;
}

async function fetchGithubRest(path, accessToken) {
  const response = await fetch(createGithubApiUrl(path), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 403) {
    throw createProfileError(
      "PORT-002-RATE-LIMITED",
      "GitHub 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  if (!response.ok) {
    throw createProfileError(
      "PORT-002-PROVIDER-UNAVAILABLE",
      "GitHub 커밋 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  return response.json();
}

function getPortfolioSyncRange() {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - PORTFOLIO_SYNC_MONTHS);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function getPathSegments(filename) {
  return String(filename || "")
    .toLowerCase()
    .split("/")
    .filter(Boolean);
}

function getFileName(filename) {
  return getPathSegments(filename).at(-1) || "";
}

function getFileExtension(filename) {
  const fileName = getFileName(filename);

  if (!fileName.includes(".")) {
    return fileName;
  }

  return fileName.split(".").at(-1);
}

function shouldExcludeCommitFile(filename) {
  const normalizedFileName = getFileName(filename);
  const pathSegments = getPathSegments(filename);
  const extension = getFileExtension(filename);

  return (
    GITHUB_IGNORED_FILE_NAMES.has(normalizedFileName) ||
    GITHUB_IGNORED_EXTENSIONS.has(extension) ||
    pathSegments.some((segment) => GITHUB_IGNORED_PATH_SEGMENTS.has(segment)) ||
    normalizedFileName.endsWith(".min.js") ||
    normalizedFileName.endsWith(".min.css")
  );
}

function classifyFileLanguage(filename) {
  const fileName = getFileName(filename);
  const extension = getFileExtension(filename);

  return GITHUB_LANGUAGE_BY_EXTENSION[fileName] || GITHUB_LANGUAGE_BY_EXTENSION[extension] || null;
}

function normalizeLanguageSummary(languageChanges) {
  const totalChanges = Object.values(languageChanges).reduce((total, changes) => total + changes, 0);

  if (!totalChanges) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(languageChanges)
      .sort(([, firstChanges], [, secondChanges]) => secondChanges - firstChanges)
      .map(([language, changes]) => [language, Math.round((changes / totalChanges) * 100)]),
  );
}

function normalizeRatioSummary(weightMap) {
  const totalWeight = Object.values(weightMap).reduce((total, weight) => total + weight, 0);

  if (!totalWeight) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(weightMap)
      .sort(([, firstWeight], [, secondWeight]) => secondWeight - firstWeight)
      .map(([label, weight]) => [label, Math.round((weight / totalWeight) * 100)]),
  );
}

function createEmptyCommitFileStats() {
  return {
    totalCommits: 0,
    analyzedCommits: 0,
    totalFiles: 0,
    analyzedFiles: 0,
    excludedFiles: 0,
    totalChanges: 0,
    analyzedChanges: 0,
  };
}

function aggregateCommitFileLanguages(commitDetails) {
  const languageChanges = {};
  const stats = createEmptyCommitFileStats();

  commitDetails.forEach((commitDetail) => {
    stats.totalCommits += 1;

    const files = Array.isArray(commitDetail.files) ? commitDetail.files : [];
    stats.totalFiles += files.length;

    files.forEach((file) => {
      const changes = Number(file.changes || file.additions || 0) + Number(file.deletions || 0);
      const language = classifyFileLanguage(file.filename);
      stats.totalChanges += changes;

      if (!language || shouldExcludeCommitFile(file.filename)) {
        stats.excludedFiles += 1;
        return;
      }

      stats.analyzedFiles += 1;
      stats.analyzedChanges += changes;
      languageChanges[language] = (languageChanges[language] || 0) + Math.max(changes, 1);
    });
  });

  stats.analyzedCommits = commitDetails.filter((commitDetail) => (
    Array.isArray(commitDetail.files) && commitDetail.files.length > 0
  )).length;

  return {
    languageSummary: normalizeLanguageSummary(languageChanges),
    languageChanges,
    stats,
  };
}

function getFrameworkEvidenceText(detector, filename, matchedByPatch) {
  const fileName = getFileName(filename);

  if (matchedByPatch) {
    return `${fileName} 의존성 변경`;
  }

  return `${fileName} 파일 패턴`;
}

function addFrameworkMatch(frameworkWeights, frameworkEvidence, detector, weight, evidence) {
  frameworkWeights[detector.name] = (frameworkWeights[detector.name] || 0) + weight;
  frameworkEvidence[detector.name] = frameworkEvidence[detector.name] || [];

  if (!frameworkEvidence[detector.name].includes(evidence)) {
    frameworkEvidence[detector.name].push(evidence);
  }
}

function analyzeCommitFileFrameworks(commitDetails) {
  const frameworkWeights = {};
  const frameworkEvidence = {};

  commitDetails.forEach((commitDetail) => {
    const files = Array.isArray(commitDetail.files) ? commitDetail.files : [];

    files.forEach((file) => {
      if (shouldExcludeCommitFile(file.filename)) {
        return;
      }

      const normalizedFilename = String(file.filename || "").toLowerCase();
      const patch = String(file.patch || "").toLowerCase();
      const changes = Math.max(Number(file.changes || file.additions || 0) + Number(file.deletions || 0), 1);

      FRAMEWORK_DETECTORS.forEach((detector) => {
        const matchedByPath = detector.patterns.some((pattern) => pattern.test(normalizedFilename));
        const matchedByPatch = detector.tokens.some((token) => patch.includes(token));

        if (detector.requiresStrongPathMatch && !matchedByPath) {
          return;
        }

        if (!matchedByPath && !matchedByPatch) {
          return;
        }

        addFrameworkMatch(
          frameworkWeights,
          frameworkEvidence,
          detector,
          changes * detector.weight,
          getFrameworkEvidenceText(detector, file.filename, matchedByPatch),
        );
      });
    });
  });

  return {
    frameworkWeights,
    frameworkEvidence,
  };
}

async function fetchGithubContentText(repository, path, accessToken) {
  try {
    const content = await fetchGithubRest(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/contents/${encodeURIComponent(path)}`,
      accessToken,
    );

    if (!content?.content || content.encoding !== "base64") {
      return "";
    }

    return atob(content.content.replace(/\s/g, ""));
  } catch {
    return "";
  }
}

async function fetchRepositoryManifestFrameworks(repositories, accessToken) {
  const frameworkWeights = {};
  const frameworkEvidence = {};
  const targetRepositories = repositories.slice(0, GITHUB_MANIFEST_FETCH_REPOSITORY_LIMIT);

  await mapWithConcurrency(targetRepositories, 2, async (repository) => {
    const manifests = await mapWithConcurrency(
      GITHUB_MANIFEST_PATHS,
      2,
      async (path) => ({
        path,
        content: await fetchGithubContentText(repository, path, accessToken),
      }),
    );

    manifests
      .filter((manifest) => manifest.content)
      .forEach((manifest) => {
        const normalizedPath = manifest.path.toLowerCase();
        const normalizedContent = manifest.content.toLowerCase();

        FRAMEWORK_DETECTORS.forEach((detector) => {
          const matchedByPath = detector.patterns.some((pattern) => pattern.test(normalizedPath));
          const matchedByContent = detector.tokens.some((token) => normalizedContent.includes(token));

          if (detector.requiresStrongPathMatch && !matchedByPath) {
            return;
          }

          if (!matchedByPath && !matchedByContent) {
            return;
          }

          addFrameworkMatch(
            frameworkWeights,
            frameworkEvidence,
            detector,
            detector.weight * Math.max(repository.changes || repository.commitCount || 1, 1),
            `${repository.nameWithOwner} ${manifest.path}`,
          );
        });
      });
  });

  return {
    frameworkWeights,
    frameworkEvidence,
  };
}

function mergeFrameworkAnalysis(firstAnalysis, secondAnalysis) {
  const frameworkWeights = { ...firstAnalysis.frameworkWeights };
  const frameworkEvidence = Object.fromEntries(
    Object.entries(firstAnalysis.frameworkEvidence).map(([framework, evidence]) => [
      framework,
      [...evidence],
    ]),
  );

  Object.entries(secondAnalysis.frameworkWeights).forEach(([framework, weight]) => {
    frameworkWeights[framework] = (frameworkWeights[framework] || 0) + weight;
  });

  Object.entries(secondAnalysis.frameworkEvidence).forEach(([framework, evidence]) => {
    frameworkEvidence[framework] = frameworkEvidence[framework] || [];
    evidence.forEach((item) => {
      if (!frameworkEvidence[framework].includes(item)) {
        frameworkEvidence[framework].push(item);
      }
    });
  });

  return {
    frameworkSummary: normalizeRatioSummary(frameworkWeights),
    frameworkEvidence: Object.fromEntries(
      Object.entries(frameworkEvidence).map(([framework, evidence]) => [
        framework,
        evidence.slice(0, 3),
      ]),
    ),
  };
}

function mergeRepositoryCommitStats(repositories, commitsByRepository, commitDetailsBySha) {
  return repositories.map((repository) => {
    const commits = commitsByRepository.get(repository.nameWithOwner) || [];
    const commitDetails = commits
      .map((commit) => commitDetailsBySha.get(commit.oid))
      .filter(Boolean);
    const changes = commitDetails.reduce((total, commitDetail) => (
      total + Number(commitDetail.stats?.total || 0)
    ), 0);

    return {
      owner: repository.owner,
      name: repository.name,
      nameWithOwner: repository.nameWithOwner,
      url: repository.url,
      isFork: Boolean(repository.isFork),
      isPrivate: Boolean(repository.isPrivate),
      stargazerCount: Number(repository.stargazerCount || 0),
      commitCount: commits.length,
      analyzedCommitCount: commitDetails.length,
      changes,
      latestContributionAt: commits[0]?.committedDate || null,
    };
  }).filter((repository) => repository.commitCount > 0);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );

  await Promise.all(workers);

  return results;
}

const CONTRIBUTION_REPOSITORIES_QUERY = `
  query PortfolioContributionRepositories($from: DateTime!, $to: DateTime!) {
    viewer {
      id
      login
      avatarUrl
      bio
      followers {
        totalCount
      }
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        commitContributionsByRepository(maxRepositories: 100) {
          contributions {
            totalCount
          }
          repository {
            name
            nameWithOwner
            url
            isFork
            isPrivate
            stargazerCount
            owner {
              login
            }
          }
        }
      }
    }
  }
`;

const REPOSITORY_COMMITS_QUERY = `
  query PortfolioRepositoryCommits(
    $owner: String!,
    $name: String!,
    $authorId: ID!,
    $since: GitTimestamp!,
    $until: GitTimestamp!,
    $cursor: String
  ) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(
              first: 100,
              after: $cursor,
              author: { id: $authorId },
              since: $since,
              until: $until
            ) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                oid
                committedDate
                additions
                deletions
                url
                messageHeadline
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchContributionRepositories(accessToken, syncRange) {
  const data = await fetchGithubGraphql(
    CONTRIBUTION_REPOSITORIES_QUERY,
    syncRange,
    accessToken,
  );
  const repositories = data.viewer.contributionsCollection.commitContributionsByRepository
    .slice(0, GITHUB_CONTRIBUTION_REPOSITORY_LIMIT)
    .map((entry) => ({
      owner: entry.repository.owner.login,
      name: entry.repository.name,
      nameWithOwner: entry.repository.nameWithOwner,
      url: entry.repository.url,
      isFork: entry.repository.isFork,
      isPrivate: entry.repository.isPrivate,
      commitContributionCount: entry.contributions.totalCount,
      stargazerCount: entry.repository.stargazerCount,
    }));

  return {
    viewer: data.viewer,
    contributions: data.viewer.contributionsCollection,
    repositories,
  };
}

async function fetchRepositoryAuthoredCommits(repository, viewerId, accessToken, syncRange) {
  const commits = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage && commits.length < GITHUB_REPOSITORY_COMMIT_LIMIT) {
    const data = await fetchGithubGraphql(
      REPOSITORY_COMMITS_QUERY,
      {
        owner: repository.owner,
        name: repository.name,
        authorId: viewerId,
        since: syncRange.from,
        until: syncRange.to,
        cursor,
      },
      accessToken,
    );
    const history = data.repository?.defaultBranchRef?.target?.history;

    if (!history) {
      return commits;
    }

    commits.push(...history.nodes.map((commit) => ({
      ...commit,
      repository: repository.nameWithOwner,
      owner: repository.owner,
      repo: repository.name,
    })));

    hasNextPage = history.pageInfo.hasNextPage;
    cursor = history.pageInfo.endCursor;
  }

  return commits.slice(0, GITHUB_REPOSITORY_COMMIT_LIMIT);
}

async function fetchCommitDetail(commit, accessToken) {
  return fetchGithubRest(
    `/repos/${encodeURIComponent(commit.owner)}/${encodeURIComponent(commit.repo)}/commits/${encodeURIComponent(commit.oid)}`,
    accessToken,
  );
}

async function fetchCommitFilePortfolio(accessToken) {
  const syncRange = getPortfolioSyncRange();
  const contributionData = await fetchContributionRepositories(accessToken, syncRange);
  const commitEntries = await mapWithConcurrency(
    contributionData.repositories,
    2,
    (repository) => fetchRepositoryAuthoredCommits(
      repository,
      contributionData.viewer.id,
      accessToken,
      syncRange,
    ),
  );
  const commitsByRepository = new Map();
  const commits = commitEntries.flat()
    .sort((firstCommit, secondCommit) => (
      new Date(secondCommit.committedDate).getTime() - new Date(firstCommit.committedDate).getTime()
    ))
    .slice(0, GITHUB_TOTAL_COMMIT_DETAIL_LIMIT);

  commits.forEach((commit) => {
    const repositoryCommits = commitsByRepository.get(commit.repository) || [];
    repositoryCommits.push(commit);
    commitsByRepository.set(commit.repository, repositoryCommits);
  });

  const commitDetails = await mapWithConcurrency(
    commits,
    GITHUB_COMMIT_DETAIL_CONCURRENCY,
    (commit) => fetchCommitDetail(commit, accessToken),
  );
  const commitDetailsBySha = new Map(
    commitDetails.map((commitDetail) => [commitDetail.sha, commitDetail]),
  );
  const contributedRepositories = mergeRepositoryCommitStats(
    contributionData.repositories,
    commitsByRepository,
    commitDetailsBySha,
  );
  const { languageSummary, stats } = aggregateCommitFileLanguages(commitDetails);
  const commitFrameworkAnalysis = analyzeCommitFileFrameworks(commitDetails);
  const manifestFrameworkAnalysis = await fetchRepositoryManifestFrameworks(
    contributedRepositories,
    accessToken,
  );
  const { frameworkSummary, frameworkEvidence } = mergeFrameworkAnalysis(
    commitFrameworkAnalysis,
    manifestFrameworkAnalysis,
  );

  return {
    viewer: contributionData.viewer,
    contributions: contributionData.contributions,
    languageSummary,
    frameworkSummary,
    frameworkEvidence,
    commitFileStats: {
      ...stats,
      syncFrom: syncRange.from,
      syncTo: syncRange.to,
      repositoryLimit: GITHUB_CONTRIBUTION_REPOSITORY_LIMIT,
      repositoryCommitLimit: GITHUB_REPOSITORY_COMMIT_LIMIT,
      commitDetailLimit: GITHUB_TOTAL_COMMIT_DETAIL_LIMIT,
    },
    contributedRepositories,
  };
}

async function fetchFallbackGithubPortfolio(profile, accessToken) {
  const githubLogin = encodeURIComponent(profile.github_login);
  const githubUser = await fetchGithubRest(`/users/${githubLogin}`, accessToken);

  return {
    githubFollowers: Number(githubUser.followers || 0),
  };
}

function toProfile(uid, profileData) {
  return {
    uid,
    ...profileData,
    displayName: profileData.display_name || "",
    photoURL: profileData.photo_url || "",
  };
}

export async function getMyProfile(uid) {
  assertFirebaseConfigured();
  assertAuthenticatedUser(uid, "PROF-001-UNAUTHENTICATED");

  const userRef = doc(db, "users", uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw createProfileError("PROF-001-NOT-FOUND", "프로필 정보를 찾을 수 없습니다.");
  }

  return toProfile(uid, userSnapshot.data());
}

export async function updateProfile(uid, profile) {
  assertFirebaseConfigured();
  assertAuthenticatedUser(uid, "PROF-002-UNAUTHENTICATED");

  const nextDisplayName = validateDisplayName(profile?.displayName);
  const nextBio = validateBio(profile?.bio);
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    display_name: nextDisplayName,
    bio: nextBio,
    updated_at: serverTimestamp(),
  });

  return getMyProfile(uid);
}

export async function syncGithubPortfolio(uid) {
  assertFirebaseConfigured();
  assertAuthenticatedUser(uid, "PORT-002-UNAUTHENTICATED");

  const profile = await getMyProfile(uid);
  assertGithubLinked(profile);

  const accessToken = await getGithubAccessToken();
  const [portfolio, fallbackProfile] = await Promise.all([
    fetchCommitFilePortfolio(accessToken),
    fetchFallbackGithubPortfolio(profile, accessToken),
  ]);
  const totalContributions = (
    Number(portfolio.contributions.totalCommitContributions || 0) +
    Number(portfolio.contributions.totalPullRequestContributions || 0) +
    Number(portfolio.contributions.totalPullRequestReviewContributions || 0) +
    Number(portfolio.contributions.totalIssueContributions || 0)
  );
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    github_repositories: portfolio.contributedRepositories.length,
    github_contributions: totalContributions,
    github_commit_contributions: Number(portfolio.contributions.totalCommitContributions || 0),
    github_pr_contributions: Number(portfolio.contributions.totalPullRequestContributions || 0),
    github_review_contributions: Number(portfolio.contributions.totalPullRequestReviewContributions || 0),
    github_issue_contributions: Number(portfolio.contributions.totalIssueContributions || 0),
    github_followers: fallbackProfile.githubFollowers,
    github_stars: portfolio.contributedRepositories.reduce(
      (total, repository) => total + Number(repository.stargazerCount || 0),
      0,
    ),
    github_language_json: portfolio.languageSummary,
    github_language_source: "COMMIT_FILES",
    github_framework_json: portfolio.frameworkSummary,
    github_framework_evidence: portfolio.frameworkEvidence,
    github_framework_source: "COMMIT_FILES_AND_DEPENDENCIES",
    github_commit_file_stats: portfolio.commitFileStats,
    github_contributed_repositories: portfolio.contributedRepositories,
    github_synced_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return getMyProfile(uid);
}
