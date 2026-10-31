/** a versioned PostgREST update matched no row: someone changed it first. Same shape as an RPC PT409 for toPgError */
export const versionConflict = () => Object.assign(new Error('version conflict'), { code: 'PT409' })
