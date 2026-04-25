import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Chromeからの特殊なリクエストを受け流すダミーパス
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/dummy.tsx"),
] satisfies RouteConfig;
