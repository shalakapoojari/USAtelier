/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production';
    const destination = isProd 
      ? 'https://shalakapoojari.pythonanywhere.com/api/:path*'
      : 'http://127.0.0.1:5000/api/:path*';
    return [
      {
        source: '/api/:path*',
        destination
      }
    ]
  }
}

export default nextConfig
