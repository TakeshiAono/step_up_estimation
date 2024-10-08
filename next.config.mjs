/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/,
      use: {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'static/media/',
        },
      },
    });

    config.module.rules.push({
      test: /\.\/slow_fib\.worker\.(js|ts)$/,
      use: {loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      }
    });

    return config;
  },
};

export default nextConfig;
