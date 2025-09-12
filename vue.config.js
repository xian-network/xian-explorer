const path = require("path")

function resolve(dir) {
  return path.join(__dirname, dir)
}

let markdown = require("markdown-it")({
  preset: "default",
  html: true,
  typographer: true,
  linkify: true,
  preprocess: (markdownIt, source) => source
})
module.exports = {
  devServer: {
    host: '0.0.0.0',
    port: 12000,
    disableHostCheck: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  },
  chainWebpack: config => {
    config.resolve.alias
      .set("assets", resolve("src/assets"))
      .set("images", resolve("src/assets/images"))
      .set("comp", resolve("src/components"))
      .set("scripts", resolve("src/scripts"))
      .set("variables", resolve("src/styles/variables.styl"))
    config.module
      .rule("pdf")
      .test(/\.pdf/)
      .use("")
      .loader("file-loader")
    config.module
      .rule("markdown")
      .test(/\.md/)
      .use("")
      .loader("vue-markdown-loader")
      .options(markdown)
  }
}
