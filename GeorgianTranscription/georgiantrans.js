let dict = "ჭ,č';წ,c';ტ,t';ყ,q';პ,p';კ,k';ძ,dz;ღ,ǧ;შ,š;ჟ,ž;ჩ,č;ა,a;ი,i;უ,u;ე,e;ო,o;ქ,k;რ,r;თ,t;ს,s;დ,d;ფ,p;გ,g;ჰ,h;ჯ,j;ლ,l;ზ,z;ც,c;ვ,v;ბ,b;ნ,n;მ,m;ხ,x"
	.split(";")
	.map((x)=>{return x.split(",")})

let g2r = dict.map((x)=>{return { search : new RegExp(x[0], "g") , replace: x[1]}})
let r2g = dict.map((x)=>{return { search : new RegExp(x[1], "g") , replace: x[0]}})

let translit = function(maparr){
	let res = textarea.value.toLowerCase()
	maparr.forEach(it => {
		res = res.replace(it.search,it.replace)
	});
	response.innerText = res
}

let textarea = document.querySelector("textarea")
let response = document.querySelector("div")

let fliptext = function(){
	let newresponse = textarea.value
	let newtextarea = response.innerText
	response.innerText = newresponse
	textarea.value = newtextarea
}




