const development = process.env.NODE_ENV === 'development';
export default {
  output: development ? undefined : 'export',
  trailingSlash: true,
  // Keep exported page directories, but do not redirect API requests before proxying.
  skipTrailingSlashRedirect: true,
  ...(development ? { async rewrites() { return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8080/api/:path*' }]; } } : {}),
};
