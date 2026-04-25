import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("play", "routes/play.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/dummy.tsx"),
] satisfies RouteConfig;
