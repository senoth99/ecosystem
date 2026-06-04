/** Локальные порты приложений (прокси с портала :3100). */
export const DEV_APP_PROXY = [
  { slug: "bloggers", path: "/bloggers", port: 3010 },
  { slug: "drops", path: "/drops", port: 3011 },
  { slug: "production-scheduler", path: "/scheduler", port: 3012 },
  { slug: "shop-scheduler", path: "/shop", port: 3013 },
  { slug: "nakleiki", path: "/nakleiki", port: 3014 },
  { slug: "proizvodstvo", path: "/proizvodstvo", port: 3015 },
  { slug: "proizvodstvo-zakazi", path: "/zakazi", port: 3016 },
  { slug: "zarplaty", path: "/zarplaty", port: 3017 }
] as const;

export function buildDevRewrites(authUrl: string) {
  const rules: { source: string; destination: string }[] = [
    { source: "/api/eco/:path*", destination: `${authUrl}/:path*` }
  ];
  for (const app of DEV_APP_PROXY) {
    const host = `http://127.0.0.1:${app.port}`;
    rules.push(
      { source: app.path, destination: `${host}${app.path}` },
      { source: `${app.path}/:path*`, destination: `${host}${app.path}/:path*` }
    );
  }
  return rules;
}
