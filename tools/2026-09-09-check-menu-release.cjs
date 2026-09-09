const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../.tmp/menu-motion-live-20260909/module-check');
let count=0;function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.m?js$/.test(file)){new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:path.relative(root,file)});count++;}}}walk(root);console.log(JSON.stringify({moduleSyntax:'passed',files:count}));
