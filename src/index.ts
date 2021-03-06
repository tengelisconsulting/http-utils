import { Server } from "./server/server";
import { Routes, RootHandler } from "./router";
import { initDownstreamService } from "./downstream";
import { DEFAULT_N_SOCKETS } from "./constants";


export const App = () => {
  const routes = Routes();
  return {
    routes,
    start: async (
      listenPort: number,
      downstreamPort?: number,
      downstreamHost?: string,
      {
        nSockets,
      } = {
        nSockets: DEFAULT_N_SOCKETS,
      }
    ) => {
      if (downstreamHost && downstreamPort) {
        console.log("initializing downstream connection...");
        await initDownstreamService(
          downstreamPort, downstreamHost, nSockets
        );
      } else {
        console.log("NOT initializing downstream connection");
      }
      const routeList = routes.list();
      console.log("routes:\n", routeList);
      const rootHandler = RootHandler(routeList, routes.errorHandler, routes.otherwise);
      const server = Server(rootHandler);
      return server.run(listenPort);
    },
  };
};

export { textRespond, jsonRespond } from "./response";
export { Downstream, runBridge } from "./downstream";
export { readBody } from "./request";
export { Auth } from "./auth";
