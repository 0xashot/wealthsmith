import { Connection, PublicKey } from "@solana/web3.js";
const c=new Connection(process.env.STABLE_YIELD_RPC_URL,"confirmed");
const SQDS=new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");
const targets={
  upgradeAuthority:"GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
  marketOwner:"24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT",
  emergencyCouncil:"4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
  proposerAuthority:"6pwkb7uMsvqgmwPBKc3o4hnte6JnHpisSUrsdyvGcEUv",
};
console.log("=== authority account classification ===");
for(const [k,v] of Object.entries(targets)){
  const pk=new PublicKey(v); const ai=await c.getAccountInfo(pk);
  console.log(`  ${k.padEnd(18)} onCurve=${String(PublicKey.isOnCurve(pk.toBytes())).padEnd(5)} owner=${ai?ai.owner.toBase58().slice(0,20):"(none)"} dataLen=${ai?ai.data.length:0}`);
}
// Enumerate Squads v4 multisig state accounts (pubkeys only) and reverse-derive vault PDAs.
console.log("\n=== enumerating Squads v4 accounts ===");
const accs=await c.getProgramAccounts(SQDS,{dataSlice:{offset:0,length:8}});
console.log("  total Squads accounts:", accs.length);
const byDisc=new Map();
for(const a of accs){const d=a.account.data.toString("hex");byDisc.set(d,(byDisc.get(d)||0)+1);}
console.log("  discriminators:", [...byDisc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([d,n])=>`${d}:${n}`).join(" "));
const want=new Set(Object.values(targets));
const found={};
for(const a of accs){
  const st=a.pubkey;
  for(let idx=0; idx<3; idx++){
    try{
      const [v]=PublicKey.findProgramAddressSync([Buffer.from("multisig"),st.toBuffer(),Buffer.from("vault"),Buffer.from([idx])],SQDS);
      const b=v.toBase58();
      if(want.has(b)){ found[b]={state:st.toBase58(),index:idx}; }
    }catch{}
  }
}
console.log("\n=== reverse-derivation results ===");
for(const [k,v] of Object.entries(targets)) console.log(`  ${k.padEnd(18)}`, found[v] ? `multisig=${found[v].state} vaultIndex=${found[v].index}` : "NO MATCH in indices 0-2");
