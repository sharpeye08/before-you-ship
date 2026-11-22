// Site-wide settings. Change these before launch.
export const SITE = {
  name: 'Before You Ship',
  tagline: 'Software fundamentals for people who build with AI',
  description:
    'Free, no-login lessons on how software really works: the web, databases, security and running apps in production. Written for complete beginners.',
  // "owner/repo" of the public GitHub repository that receives "Report a mistake" issues.
  githubRepo: import.meta.env.PUBLIC_GITHUB_REPO || 'sharpeye08/before-you-ship',
  // Cloudflare Web Analytics token. Analytics are off when this is empty.
  cfBeaconToken: import.meta.env.PUBLIC_CF_BEACON_TOKEN || '',
};

export const LEVELS = [
  {
    n: 1,
    name: 'Foundations',
    blurb: 'How the web works, where code and data live, and how to undo and debug. Assumes nothing.',
  },
  {
    n: 2,
    name: 'Builder',
    blurb: 'Build features that are safe and correct, and spot the security holes in AI-written code.',
  },
  {
    n: 3,
    name: 'Shipping',
    blurb: 'Run an app for real users: test it, deploy it safely, know when it breaks, control costs.',
  },
  {
    n: 4,
    name: 'Reliability & scale',
    blurb: 'Stay fast and correct under real load and real money, and make the calls AI can\'t.',
  },
] as const;
