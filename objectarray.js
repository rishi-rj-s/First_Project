const a=[{ab:12,bc:23},{a:45,b:23}] 

let sum=0;

for(const obj of a){
    for(const key in obj){
        sum+=obj[key]
    }
}

console.log(sum);

// function sum(num){
//     return num.reduce((acc,curr)=>{
//         if(typeof curr=='number'){
//             return acc+curr
//         }else if(Array.isArray(curr)){
//             return acc+sum(curr)
//         }else if(typeof curr=='object'){
//             return acc+sum(Object.values(curr))
//         }else{
//             return acc;
//         }

        
//     },0)
// }

// console.log(sum(a));