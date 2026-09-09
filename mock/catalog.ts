import type { Pin, Track, MoodVector } from '@/lib/types';
const night: MoodVector = {dreamy:.9, nostalgic:.8, calm:.55, warm:.12, energetic:.25, cinematic:.85};
const quiet: MoodVector = {dreamy:.65, nostalgic:.45, calm:.95, warm:.25, energetic:.05, cinematic:.5};
const summer: MoodVector = {dreamy:.65, nostalgic:.7, calm:.6, warm:.95, energetic:.4, cinematic:.4};
const city: MoodVector = {dreamy:.5, nostalgic:.6, calm:.25, warm:.3, energetic:.9, cinematic:.85};
const raw = [
 ['The city, after everyone leaves','1534274988757-a28bf1a57c17','Valentin Müller','bWtd1ZyEy6w',night,'Photography',1200,1700,['rain','night','city']],
 ['Somewhere between sea and sky','1501436513145-30f24e19fcc8','Linus Nylund','JP23z_-dA74',summer,'Dream Life',1200,900,['ocean','sunset','summer']],
 ['A little room to breathe','1486718448742-163732cd1544','Ricardo Gomez Angel','PzYiCWOHtfU',quiet,'Architecture',1200,1500,['architecture','light','quiet']],
 ['Soft things, slowly','1582794543139-8ac9cb0f7b11','Rikonavt','oEWdQsbRVZk',summer,'Photography',1200,1650,['flowers','pink','romantic']],
 ['No particular place to be','1503435980610-a51f3ddfee50','Filip Zrnzević','QsWG0kjPQRY',quiet,'Dream Life',1200,1500,['forest','green','mist']],
 ['The sound of staying in','1600818797017-d6e5027210bb','Sixteen Miles Out','GVhAezjtX-4',quiet,'Quiet Moments',1200,900,['coffee','books','morning']],
 ['Every window holds a story','1517328894681-0f5dfabd463c','Filip Mroz','VH7NuUbj104',city,'Photography',1200,1700,['city','rain','street']],
 ['Meet me where the light ends','1642922835816-e2ac68db5c42','Kishore V','taVGqBGCAdo',summer,'Dream Life',1200,1500,['sea','sunset','warm']],
 ['Lost in the right direction','1448375240586-882707db888b','Sebastian Unrau','sp-p7uuT0tw',quiet,'Dream Life',1200,900,['forest','nature','calm']],
 ['Lines of a slower life','1525286335722-c30c6b5df541','Flipboard','h5H5UyXBLBQ',city,'Architecture',1200,1600,['architecture','city','geometry']],
 ['Another chapter','1519682577862-22b62b24e493','Thought Catalog','OJZB0VUQKKc',quiet,'Quiet Moments',1200,1450,['book','coffee','nostalgic']],
 ['A season worth remembering','1602615576820-ea14cf3e476a','TOMOKO UJI','kxvn1ogpTtE',summer,'Photography',1200,1000,['blossom','pink','spring']],
 ['Nothing but afternoon','1483366774565-c783b9f70e2c','Kimon Maritz','mQiZnKwGXW0',quiet,'Architecture',1200,1700,['minimal','architecture','light']],
 ['Spaces in between','1531591022136-eb8b0da1e6d0','Tobias Keller','2ecH5Lw3zSk',night,'Architecture',1200,1350,['building','cinematic','quiet']],
 ['Let the day unfold','1630262344136-309cf5d39c02','Zoe','V8dteQ3sdx0',summer,'Quiet Moments',1200,1550,['coffee','book','warm']],
 ['Angles of possibility','1522743791393-522312deeebf','Simone Hutsch','ItvVUpgac0o',city,'Architecture',1200,1200,['geometry','architecture','color']],
 ['Pages, not plans','1607473128383-0cf6c96f0689','Alexandra Fuller','5hUHRyKtwEE',quiet,'Quiet Moments',1200,1600,['book','wood','slow']],
] as const;
export const pins: Pin[] = raw.map((r,i)=>({id:`pin-${i}`,title:r[0],image:`https://images.unsplash.com/photo-${r[1]}?auto=format&fit=crop&w=900&q=85`,photographer:r[2],source:`https://unsplash.com/photos/${r[3]}`,mood:r[4],board:r[5],width:r[6],height:r[7],tags:[...r[8]]}));
export const tracks: Track[] = [
 {id:'t0',title:'After the rain',artist:'Far.Fly Studio',artwork:pins[0].image,colors:['#47566a','#161d2a'],duration:96,source:'/audio/after-the-rain.wav',tags:['dreamy','cinematic'],mood:night,provider:'mock'},
 {id:'t1',title:'A softer kind of blue',artist:'Far.Fly Studio',artwork:pins[1].image,colors:['#667f88','#182d35'],duration:96,source:'/audio/softer-blue.wav',tags:['ambient','nostalgic'],mood:quiet,provider:'mock'},
 {id:'t2',title:'Golden, for a moment',artist:'Far.Fly Studio',artwork:pins[7].image,colors:['#b07a54','#352422'],duration:96,source:'/audio/golden.wav',tags:['warm','mellow'],mood:summer,provider:'mock'},
 {id:'t3',title:'Where the light goes',artist:'Far.Fly Studio',artwork:pins[3].image,colors:['#ab718e','#372533'],duration:96,source:'/audio/light.wav',tags:['soft','dreamy'],mood:{...summer,dreamy:.95},provider:'mock'},
 {id:'t4',title:'A place without time',artist:'Far.Fly Studio',artwork:pins[4].image,colors:['#527463','#182b25'],duration:96,source:'/audio/place.wav',tags:['calm','ambient'],mood:quiet,provider:'mock'},
 {id:'t5',title:'Windows still awake',artist:'Far.Fly Studio',artwork:pins[6].image,colors:['#777c9a','#202037'],duration:96,source:'/audio/windows.wav',tags:['electronic','night'],mood:city,provider:'mock'},
];
export const boards = ['Photography','Architecture','Dream Life','Quiet Moments'];
