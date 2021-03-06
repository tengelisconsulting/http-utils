/**
 * This defines the top level route handler
 */
import querystring from "querystring";
import url, { UrlWithParsedQuery } from "url";
import fp from "lodash/fp";

import { RouteConf, CB, Req, Res, DefaultHandler, ErrorHandler } from "../@types";
import { Method } from "../constants";
import { textRespond } from "../response";


interface RouteLookup {
  [index: string]: {
    [index in Method]: CB;
  };
}


export const RootHandler = (
  routes: RouteConf[],
  errorHandler?: ErrorHandler,
  otherwise?: DefaultHandler,
): CB => {
  const routeLookup: RouteLookup = routes.reduce(
    (acc, {path, method, cbs}) => fp.set([path, method], cbs)(acc),
    {});

  return async (req: Req, res: Res) => {
    try {
      if (!req.url) {
        return
      }
      const urlParts = url.parse(req.url || "");
      const parsedUrlQuery: UrlWithParsedQuery | undefined = urlParts.query && {
        ...urlParts,
        query: querystring.parse(urlParts.query),
      } as any;
      req.qParams = parsedUrlQuery?.query;
      const method = req.method || "";
      const path = urlParts.pathname || "";
      const key = `${path}.${method}`;
      const getOtherwiseHandlers = () => otherwise && otherwise(method, path);
      const handlers: CB[] = fp.get(key)(routeLookup)
        || getOtherwiseHandlers();
      if (!handlers) {
        return textRespond({res, status: 404, body: "Not Found"});
      }

      // This establishes the middleware flow.
      // Imperative to allow early breaks.
      let workingReq = req;
      let workingRes = res;
      for (let handler of handlers) {
        const stepResult = await handler(workingReq, workingRes, parsedUrlQuery);
        if (!stepResult) {
          // we terminate early
          break;
        }
        workingRes = stepResult.res;
        workingReq = stepResult.req;
      }
    } catch (e) {
      if (errorHandler) {
        return errorHandler(e, req, res);
      }
      // default error handling
      console.trace(e);
      return textRespond({res, status: 500, body: "Server Error"});
    }
  };
}
