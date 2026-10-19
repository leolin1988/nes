export function canonicalDepartmentName(value:unknown){const name=String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ');return name==='光篩全檢包裝組'?'光學全檢包裝組':name;}


