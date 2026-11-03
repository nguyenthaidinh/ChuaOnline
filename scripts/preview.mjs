process.env.PORT ??= '4173';
const { createTempleServer } = await import('../server/index.ts');
const host=process.env.HOST??'127.0.0.1';
createTempleServer().listen(Number(process.env.PORT),host,()=>console.log(`Shared temple preview: http://${host}:${process.env.PORT}/`));
