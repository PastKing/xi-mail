const ready=new WeakMap();
const objectLocations={
 async ensure(c){
  const db=c.env.db;
  if(!ready.has(db))ready.set(db,db.prepare(`CREATE TABLE IF NOT EXISTS object_storage_locations(
   logical_key TEXT NOT NULL,backend TEXT NOT NULL,physical_key TEXT NOT NULL,
   PRIMARY KEY(logical_key,backend,physical_key))`).run().catch(error=>{ready.delete(db);throw error}));
  await ready.get(db);
 },
 async list(c,key){await this.ensure(c);return(await c.env.db.prepare('SELECT backend,physical_key AS physicalKey FROM object_storage_locations WHERE logical_key=? ORDER BY rowid DESC').bind(key).all()).results;},
 async record(c,key,backend,physicalKey){await this.ensure(c);await c.env.db.prepare('INSERT OR REPLACE INTO object_storage_locations(logical_key,backend,physical_key) VALUES(?,?,?)').bind(key,backend,physicalKey).run();},
 async forget(c,key){await this.ensure(c);await c.env.db.prepare('DELETE FROM object_storage_locations WHERE logical_key=?').bind(key).run();},
 async listMany(c,keys){
  await this.ensure(c);const rows=[];
  for(let i=0;i<keys.length;i+=80){const part=keys.slice(i,i+80);rows.push(...(await c.env.db.prepare(`SELECT logical_key AS logicalKey,backend,physical_key AS physicalKey FROM object_storage_locations WHERE logical_key IN (${part.map(()=>'?').join(',')})`).bind(...part).all()).results);}
  return rows;
 },
 async forgetMany(c,keys){
  await this.ensure(c);
  for(let i=0;i<keys.length;i+=80){const part=keys.slice(i,i+80);await c.env.db.prepare(`DELETE FROM object_storage_locations WHERE logical_key IN (${part.map(()=>'?').join(',')})`).bind(...part).run();}
 },
};
export default objectLocations;
