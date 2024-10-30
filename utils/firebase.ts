// utils/firebase.ts

import admin from 'firebase-admin';

console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);

const firebaseConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDmtUa6MIfW1FpL\\nz+hTtIL0gYbL28D5p0afs9q0HDnz/arMBbyoD8n+iMjKZAax1C0VGjiJsUPB15bf\\n+ONkmWGkEzwWJ4WYjStiIg87oXetHEPM8mleB96fZmZoCf+akDxN01PnFBnhhYhT\\nO0Aga3SV7J/X/lugAOU8KWWk9XvF+q4jykznTHREQqQE3BGTg6JYr6TAFueOw9W4\\nHB0D+/EK0tvcwMI8PavmBXJXMDZXZcCIOtm1gocRdZcBtReKCjqTpup3DU1Udp+7\\niPyK45/Z3w+efAubRVkezJ3oDZRqmX5S8ZEQcsAD/EnHj/xqYQ5TBaqy1yiz6+iO\\nY+kCuGLzAgMBAAECggEAQ4TSCjOhzbGgK4fRSo4NtVkjBg5uT6Iw/RQ58XRBUbLv\\nhX44VEcqqp+FhBX6D5k1CHQAD+wdFGHv+eRxSEPLW6V1dFZktty50aJ+Ksl6qOMY\\nxKY9SBOth6EEX3Zto+KKg4xRhdNQL7xQxWsVvWc1W5tAvInobs9UR2MmKDzf2HSS\\njuxnqylyYwX/UK13LGviZr+jPtcgZhrFH/9iMlISslCblwxRIUtA2fw1Wr5vTw/K\\nCDkcIB7KK952ms+Rp1lNbbmS3EHoK7wyriPubimAqsKU/MfK6anQFo6kK5ypCgh5\\ntL+OKwaIB/j6tbvgRKLPZManLfCD6m15BEgvhpfhwQKBgQD/NSOToie3fDdo8Ybc\\nwMcqbKcjNDS97uHbMTchftfgxAhrVgznzl6Wc3SRs48YBijXUQGf2IkoYHdDuyvs\\nrORHAiP6spbzYiRcYNgMmPJtPF+SAg3aIHtxGA264uGHXrsyauK4b5kTQ00iKXiM\\nEbu2ZskufEP/W/z/gwGv/MAsyQKBgQDnbKm7dv5v13fYlzFwD0q2WhgRqds7cKUE\\ny0dnBc38rXeN8rWqhI59wMQ/GSQpME8aHq0TTMj4CtatfGBRldWk4tYOLLh+mlTY\\nz+X/j2MXiyRpmUUkKpa8gmlSQLCNuy1sIxbed3bq+IP7DhEqZmEO/7/Slq3Uyh0Z\\nZDTzlKH72wKBgQDu4C9Xvb0NOuCmgwRn1q3VoPPkuLXxXgrb3zoqSQ8J3JPA3D+i\\nLgFNM+5Vfsuegg1yVOl/U/A18e1QYX7gvofBi1hgDQ/L6f381c0EJZks9AjEotWS\\naTsCBbC8UCcnTV1M+M0UM6kFZcZqBoVGHkckmRsQPtJq0BCEnXxT3PGIOQKBgCVR\\nWG1qWs0eKa07dDVlwd512LvAcCG9oF6NiQ4L2ZONRWIWaUT96xxMIVkrbLFXoOnN\\nWItsLlwRI10GWWHOj4zvJyVSAM4phNURcT0smgYJ4e1FUejrFTOAtAsXc2DndgOi\\nBOYKzZpGSMILGqmDqNMKWpxSv+U4Ukjt57v/k79RAoGBANjKq2HnmhcaRyoPHSEi\\nxy9/M3bTq5g+2SYTEDCcsYguyIJSTkoQFC3NtpNvul2IWFNRRPIAe/xkrpk8W1FI\\nQZbQEcRk7EQOiqL58GU7lexhqzBcjdrhhm+bUfqxgoyWwlCdOsOMKvdhTkcV3a4N\\nrweZEQ73GokXvrNg001qnYCM\\n-----END PRIVATE KEY-----\\n".replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

if (!admin.apps.length) {
  admin.initializeApp(firebaseConfig);
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export default db;