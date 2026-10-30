import type { Instrumentation } from 'next'

// Every uncaught error of a page, layout, route handler, server action or proxy; the err serializer keeps the digest
// the user sees
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  const { logger } = await import('@/lib/logger/logger.server')

  logger.error(
    {
      err: error,
      // the query string may carry search text, so only the path is logged
      path: request.path.split('?')[0],
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
      routerKind: context.routerKind,
    },
    'request failed',
  )
}
