export function validEmail(value:string){
 return value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validBirthDate(value:string,today=new Date().toISOString().slice(0,10)){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01'||value>today)return false;
 const date=new Date(value+'T00:00:00.000Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function personError(name:string,birth:string,nif:string,email='',today?:string){
 if(!name.trim()||name.length>200)return 'Indique o nome completo, até 200 caracteres.';
 if(!validBirthDate(birth,today))return 'Indique uma data de nascimento válida, que não seja futura.';
 if(!/^[1-9][0-9]{8}$/.test(nif))return 'Indique um NIF com nove algarismos.';
 if(email&&!validEmail(email))return 'Indique um email válido.';
 return null;
}
