const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

/*function initCanisterEnv() {
  let localCanisters, prodCanisters;
  try {
    localCanisters = require(path.resolve(
      ".dfx",
      "local",
      "canister_ids.json"
    ));
  } catch (error) {
    console.log("No local canister_ids.json found. Continuing production");
  }
  try {
    prodCanisters = require(path.resolve("canister_ids.json"));
  } catch (error) {
    console.log("No production canister_ids.json found. Continuing with local");
  }

  const network =
    process.env.DFX_NETWORK ||
    (process.env.NODE_ENV === "production" ? "ic" : "local");

  const canisterConfig = network === "local" ? localCanisters : prodCanisters;

  console.log("🌐 Using network:", network);
  console.log("🔍 Canister Config:", canisterConfig);

  if (!canisterConfig) {
    console.error("❌ ERROR: Canister config is undefined!");
    process.exit(1);
  }

  return Object.entries(canisterConfig).reduce((prev, current) => {
    const [canisterName, canisterDetails] = current;
    prev[canisterName.toUpperCase() + "_CANISTER_ID"] =
      canisterDetails[network];
    return prev;
  }, {});
}
const canisterEnvVariables = initCanisterEnv();
console.log("📌 Canister Environment Variables:", canisterEnvVariables);*/
function initCanisterEnv() {
  let localCanisters = {};
  let prodCanisters = {};
  
  try {
    const localPath = path.resolve(".dfx", "local", "canister_ids.json");
    console.log("🔍 Checking for local canister_ids.json at:", localPath);
    localCanisters = require(localPath);
    console.log("✅ Loaded local canisters:", localCanisters);
  } catch (error) {
    console.warn("⚠️ No local canister_ids.json found.");
  }

  try {
    const prodPath = path.resolve("canister_ids.json");
    console.log("🔍 Checking for production canister_ids.json at:", prodPath);
    prodCanisters = require(prodPath);
    console.log("✅ Loaded production canisters:", prodCanisters);
  } catch (error) {
    console.warn("⚠️ No production canister_ids.json found.");
  }

  const network = process.env.DFX_NETWORK || (process.env.NODE_ENV === "production" ? "ic" : "local");
  console.log("🌐 Using network:", network);

  const canisterConfig = network === "local" ? localCanisters : prodCanisters;

  if (!canisterConfig || Object.keys(canisterConfig).length === 0) {
    console.error("❌ ERROR: Canister config is empty or undefined!");
    return {};  // Return an empty object to prevent errors
  }

  return Object.entries(canisterConfig).reduce((prev, [name, details]) => {
    if (!details[network]) {
      console.warn(`⚠️ Warning: Canister ID for ${name} is missing in ${network} environment.`);
    }
    prev[`${name.toUpperCase()}_CANISTER_ID`] = details[network] || "MISSING_CANISTER_ID";
    return prev;
  }, {});
}

const canisterEnvVariables = initCanisterEnv();

console.log("📌 Final Canister Environment Variables:", canisterEnvVariables);


const isDevelopment = process.env.NODE_ENV !== "production";

const frontendDirectory = "opend_assets";

const asset_entry = path.join("src", frontendDirectory, "src", "index.html");

module.exports = {
  target: "web",
  mode: isDevelopment ? "development" : "production",
  entry: {
    // The frontend.entrypoint points to the HTML file for this build, so we need
    // to replace the extension to `.js`.
    index: path.join(__dirname, asset_entry).replace(/\.html$/, ".jsx"),
  },
  devtool: isDevelopment ? "source-map" : false,
  optimization: {
    minimize: !isDevelopment,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx"],
    fallback: {
      assert: require.resolve("assert/"),
      buffer: require.resolve("buffer/"),
      events: require.resolve("events/"),
      stream: require.resolve("stream-browserify/"),
      util: require.resolve("util/"),
    },
  },
  output: {
    filename: "index.js",
    path: path.join(__dirname, "dist", frontendDirectory),
  },

  // Depending in the language or framework you are using for
  // front-end development, add module loaders to the default
  // webpack configuration. For example, if you are using React
  // modules and CSS as described in the "Adding a stylesheet"
  // tutorial, uncomment the following lines:
  module: {
    rules: [
      { test: /\.(ts|tsx|jsx)$/, loader: "ts-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      { test: /\.svg$/, use: ["svg-url-loader"] },
      { test: /\.(jpg|png|webp)$/, use: ["url-loader"] },
    ]
   },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, asset_entry),
      cache: false,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.join(__dirname, "src", frontendDirectory, "assets"),
          to: path.join(__dirname, "dist", frontendDirectory),
        },
      ],
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: "development",
      ...canisterEnvVariables,
    }),
    new webpack.ProvidePlugin({
      Buffer: [require.resolve("buffer/"), "Buffer"],
      process: require.resolve("process/browser"),
    }),
  ],
  devServer: {
    historyApiFallback: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        pathRewrite: {
          "^/api": "/api",
        },
      },
    },
    hot: true,
    watchFiles: [path.resolve(__dirname, "src", frontendDirectory)],
    liveReload: true,
  },
};
