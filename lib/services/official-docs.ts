export interface DiscoveredResource {
  title: string;
  url: string;
  source: "Official Docs";
  type: "Article";
}

const documentationMap: Record<
  string,
  { title: string; url: string }
> = {
  javascript: {
    title: "MDN JavaScript Guide",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
  },
  typescript: {
    title: "TypeScript Documentation",
    url: "https://www.typescriptlang.org/docs/",
  },
  react: {
    title: "React Documentation",
    url: "https://react.dev/learn",
  },
  "next.js": {
    title: "Next.js Documentation",
    url: "https://nextjs.org/docs",
  },
  nextjs: {
    title: "Next.js Documentation",
    url: "https://nextjs.org/docs",
  },
  python: {
    title: "Python Documentation",
    url: "https://docs.python.org/3/",
  },
  node: {
    title: "Node.js Documentation",
    url: "https://nodejs.org/docs/latest/api/",
  },
  "node.js": {
    title: "Node.js Documentation",
    url: "https://nodejs.org/docs/latest/api/",
  },
  html: {
    title: "MDN HTML Documentation",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
  },
  css: {
    title: "MDN CSS Documentation",
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS",
  },
};

export function discoverOfficialDocs(
  searchKeywords: string[],
  maxResults: number
): DiscoveredResource[] {
  const resources: DiscoveredResource[] = [];

  for (const keyword of searchKeywords) {
    const documentation = documentationMap[keyword.toLowerCase().trim()];

    if (!documentation) {
      continue;
    }

    resources.push({
      ...documentation,
      source: "Official Docs",
      type: "Article",
    });

    if (resources.length >= maxResults) {
      break;
    }
  }

  return resources;
}

