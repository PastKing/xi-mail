// Registration and invitation usage commit together. External login identities have no hosted mailbox.
export async function createRegistration(c, data, invitation = null) {
  const db = c.env.db;
  const guard = invitation ? `AND EXISTS(SELECT 1 FROM reg_key WHERE rege_key_id=? AND code=? COLLATE NOCASE
    AND role_id=? AND count>0 AND (expire_time IS NULL OR julianday(expire_time)>=julianday(?)))` : '';
  const values = [data.email,data.type,data.password,data.salt,data.regKeyId,data.displayId,data.email,data.email];
  if (invitation) values.push(data.regKeyId,invitation.code,data.type,invitation.todayStart);
  const queries = [
    db.prepare(`INSERT INTO user(email,type,password,salt,reg_key_id,display_id)
      SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM user WHERE email=? COLLATE NOCASE)
      AND NOT EXISTS(SELECT 1 FROM account WHERE email=? COLLATE NOCASE) ${guard} RETURNING user_id`).bind(...values),
  ];
  if (data.createMailbox !== false) queries.push(db.prepare(`INSERT INTO account(email,user_id,name)
      SELECT email,user_id,? FROM user WHERE display_id=? AND email=? AND password=? AND salt=? AND changes()=1`)
      .bind(data.name,data.displayId,data.email,data.password,data.salt));
  if (invitation) queries.push(db.prepare('UPDATE reg_key SET count=count-1 WHERE rege_key_id=? AND count>0 AND changes()=1').bind(data.regKeyId));
  const result = await db.batch(queries);
  return result[0].results?.[0]?.user_id || null;
}
