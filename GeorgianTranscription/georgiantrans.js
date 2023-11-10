let dict = "ა,a;ი,i;უ,u;ე,e;ო,o;ქ,k;წ,c';ჭ,č';რ,r;ღ,ǧ;ტ,t';თ,t;ყ,q';პ,p';ს,s;შ,š;დ,d;ფ,p;გ,g;ჰ,h;ჯ,j;ჟ,ž;კ,k';ლ,l;ზ,z;ძ,dz;ც,c;ჩ,č;ვ,v;ბ,b;ნ,n;მ,m"
    .split(";")
    .map((x)=>{return x.split(",")})

let map = {}

dict.forEach(pair => {
    map[pair[0]] = pair[1]
});

console.log(map)

let textarea = document.querySelector("textarea")
let response = document.querySelector("div")
let translit = function(){
    response.innerText = textarea.value.split("").map(
        function(x){
            if (Object.keys(map).includes(x)){
                return map[x]
            } else {
                return x
            }
        }
    ).join("")
}

