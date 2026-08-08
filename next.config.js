/**@type {import('next').NextConfig}*/
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['firebasestorage.googleapis.com', 'res.cloudinary.com'],
        unoptimized: false,
    },
    trailingSlash: false,
    output: 'standalone',
}

module.exports = nextConfig