<?php
declare(strict_types=1);
// Non-secret server limits. Deployment secrets and paths are private.
return [
    'schema' => 1, 'maxEventBytes' => 65536, 'maxSaveBytes' => 8388608,
    'maxEvents' => 128, 'maxFieldCount' => 40, 'maxFieldDepth' => 3, 'maxStringLength' => 80,
    'maxSlot' => 6, 'minimumFreeBytes' => 536870912, 'requestsPerMinute' => 120,
    'bytesPerIpDay' => 134217728, 'bytesPerDay' => 2147483648,
    'eventRetentionDays' => 14, 'saveRetentionDays' => 30, 'saveVersionsPerSlot' => 5,
    'maxAgeMs' => 86400000, 'maxSessionMs' => 2592000000, 'futureClockMs' => 300000,
    'fields' => explode(',', 'action,result,reason,code,button,pointer,x,y,worldX,worldY,heldMs,synthetic,scene,phase,slot,level,xp,gp,hp,depth,gold,flying,running,paused,fps,revision,bytes,count,dropped,tileX,tileY,tileType,damage,destroyed,success,upgrade,rank,progress,line,column,file,visible,focused,state,totals,gameplay,idle,menu,loading,pausedTime,hidden,unfocused,unknown,axis,index,value,from,to,elapsedMs,build,stage,amount,shop,dialogue,inventory,map,dead'),
];
