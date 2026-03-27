const db = require('./database');
const { hashPassword, uuid } = require('./crypto');

console.log('[SEED] Initialisation BoltDj...');

const adminHash = hashPassword('Admin2026!');
try {
  db.prepare('INSERT OR IGNORE INTO admins (id,email,password_hash,name) VALUES (?,?,?,?)').run(uuid(),'admin@boltdj.dj',adminHash,'Super Admin BoltDj');
} catch(e) {}

const restHash = hashPassword('Restaurant2026!');
const restaurants = [
  { code:'REST001',name:'La Scorpion',category:'Fruits de mer',description:'Spécialités de fruits de mer frais',address:'Bender Djedid, face à la plage',quartier:'Bender Djedid',phone:'+25377123456',manager_name:'Omar Said',logo_emoji:'🦞',delivery_time:'25-35 min',delivery_fee:300,min_order:500,rating:4.8,total_reviews:142,status:'active',is_open:1 },
  { code:'REST002',name:'Pizza Djibouti',category:'Pizza',description:'Pizzas artisanales au feu de bois',address:'Plateau du Serpent, Rue 5',quartier:'Plateau du Serpent',phone:'+25377987654',manager_name:'Marco Rossi',logo_emoji:'🍕',delivery_time:'20-30 min',delivery_fee:300,min_order:500,rating:4.5,total_reviews:98,status:'active',is_open:1 },
  { code:'REST003',name:'Burger Zone DJ',category:'Fast Food',description:'Burgers généreux et frites croustillantes',address:'Quartier 1, Boulevard de Gaulle',quartier:'Quartier 1',phone:'+25377556677',manager_name:'Karim Diallo',logo_emoji:'🍔',delivery_time:'15-25 min',delivery_fee:200,min_order:500,rating:4.3,total_reviews:211,status:'active',is_open:1 },
  { code:'REST004',name:'Le Palais du Golf',category:'Local',description:'Cuisine djiboutienne traditionnelle',address:'Plateau du Serpent',quartier:'Plateau du Serpent',phone:'+25377112233',manager_name:'Ahmed Hassan',logo_emoji:'🥘',delivery_time:'30-45 min',delivery_fee:300,min_order:500,rating:0,total_reviews:0,status:'pending',is_open:0 },
  { code:'REST005',name:'Shawarma Express',category:'Grillades',description:'Shawarmas et grillades fraîches',address:'Quartier 7',quartier:'Quartier 7',phone:'+25377334455',manager_name:'Fatima Ali',logo_emoji:'🌯',delivery_time:'15-20 min',delivery_fee:200,min_order:500,rating:0,total_reviews:0,status:'pending',is_open:0 },
];

const ids = {};
for (const r of restaurants) {
  const id = uuid();
  ids[r.code] = id;
  try {
    db.prepare('INSERT OR IGNORE INTO restaurants (id,code,name,description,category,address,quartier,phone,manager_name,password_hash,logo_emoji,delivery_time,delivery_fee,min_order,rating,total_reviews,status,is_open) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,r.code,r.name,r.description,r.category,r.address,r.quartier,r.phone,r.manager_name,restHash,r.logo_emoji,r.delivery_time,r.delivery_fee,r.min_order,r.rating,r.total_reviews,r.status,r.is_open);
  } catch(e) { ids[r.code] = db.prepare('SELECT id FROM restaurants WHERE code=?').get(r.code)?.id || id; }
}

// Menu: La Scorpion
function addMenu(restCode, sections) {
  const restId = db.prepare('SELECT id FROM restaurants WHERE code=?').get(restCode)?.id;
  if (!restId) return;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const catId = uuid();
    try { db.prepare('INSERT OR IGNORE INTO menu_categories (id,restaurant_id,name,sort_order) VALUES (?,?,?,?)').run(catId,restId,s.name,i); } catch(e){}
    const realCatId = db.prepare('SELECT id FROM menu_categories WHERE restaurant_id=? AND name=?').get(restId,s.name)?.id || catId;
    for (let j = 0; j < s.items.length; j++) {
      const it = s.items[j];
      try { db.prepare('INSERT OR IGNORE INTO menu_items (id,restaurant_id,category_id,name,description,price,emoji,is_available,sort_order) VALUES (?,?,?,?,?,?,?,?,?)').run(uuid(),restId,realCatId,it.name,it.desc||'',it.price,it.emoji||'🍽️',it.available!==false?1:0,j); } catch(e){}
    }
  }
}

addMenu('REST001',[
  { name:'Entrées', items:[{name:'Salade de crabe',desc:'Crabe frais, avocat, citron',price:1500,emoji:'🥗'},{name:'Soupe de poisson',desc:'Bouillon maison, légumes',price:1200,emoji:'🍲'}]},
  { name:'Plats principaux', items:[{name:'Homard grillé',desc:'Homard entier, beurre ail, frites',price:4500,emoji:'🦞'},{name:'Poisson braisé',desc:'Poisson du jour, sauce locale, riz',price:2800,emoji:'🐟'},{name:'Plateau fruits de mer',desc:'Crevettes, calamars, poisson',price:5500,emoji:'🍱',available:false}]},
  { name:'Boissons', items:[{name:'Jus de bissap',desc:'Hibiscus frais',price:400,emoji:'🥤'},{name:'Eau minérale 50cl',price:200,emoji:'💧'}]}
]);
addMenu('REST002',[
  { name:'Pizzas', items:[{name:'Margherita DJ',desc:'Tomate, mozzarella, basilic',price:2200,emoji:'🍕'},{name:'Pizza Djiboutienne',desc:'Viande, harissa, fromage',price:2800,emoji:'🍕'},{name:'Quattro Stagioni',desc:'Jambon, champignons, poivrons, olives',price:2600,emoji:'🍕'}]},
  { name:'Accompagnements', items:[{name:'Salade César',price:900,emoji:'🥗'},{name:'Frites maison',price:700,emoji:'🍟'}]},
  { name:'Boissons', items:[{name:'Coca-Cola 33cl',price:350,emoji:'🥤'},{name:'Limonade citron',price:400,emoji:'🍋'}]}
]);
addMenu('REST003',[
  { name:'Burgers', items:[{name:'Classic Burger',desc:'Steak, salade, tomate, cheddar',price:1800,emoji:'🍔'},{name:'Spicy Djibouti',desc:'Double steak, piment fort',price:2400,emoji:'🌶️'},{name:'Chicken Burger',desc:'Poulet crispy, coleslaw',price:1900,emoji:'🍗'}]},
  { name:'Menus', items:[{name:'Menu Classic',desc:'Burger + Frites + Boisson',price:2500,emoji:'🍱'},{name:'Menu XL',desc:'Double burger + Grandes frites + Boisson',price:3200,emoji:'🍱'}]},
  { name:'Desserts', items:[{name:'Milkshake vanille',price:800,emoji:'🥛'},{name:'Brownie fondant',price:700,emoji:'🍫'}]}
]);

// Demo client
const clientId = uuid();
try {
  db.prepare('INSERT OR IGNORE INTO clients (id,phone,first_name,last_name,is_verified) VALUES (?,?,?,?,?)').run(clientId,'+25377112233','Hodan','Abdi',1);
  const cId = db.prepare('SELECT id FROM clients WHERE phone=?').get('+25377112233')?.id || clientId;
  db.prepare('INSERT OR IGNORE INTO addresses (id,client_id,label,quartier,street,landmark,latitude,longitude,is_default) VALUES (?,?,?,?,?,?,?,?,?)').run(uuid(),cId,'Maison','Bender Djedid','Rue 12','Près du marché',11.5886,43.1451,1);
  db.prepare('INSERT OR IGNORE INTO addresses (id,client_id,label,quartier,street,landmark,is_default) VALUES (?,?,?,?,?,?,?)').run(uuid(),cId,'Bureau','Plateau du Serpent','Bâtiment Admin','Face à la préfecture',0);
} catch(e){}

// Demo livreurs
const livHash = hashPassword('Livreur2026!');
const livs = [{name:'Moussa Kamil',phone:'+25377102030',zone:'Centre-ville',rating:4.9,total_deliveries:312,status:'available'},{name:'Ibrahim Ahmed',phone:'+25377405060',zone:'Bender Djedid',rating:4.7,total_deliveries:198,status:'offline'},{name:'Ali Hassan',phone:'+25377708090',zone:'Plateau',rating:4.5,total_deliveries:87,status:'offline'}];
for (const l of livs) {
  try { db.prepare('INSERT OR IGNORE INTO livreurs (id,name,phone,password_hash,zone,rating,total_deliveries,status) VALUES (?,?,?,?,?,?,?,?)').run(uuid(),l.name,l.phone,livHash,l.zone,l.rating,l.total_deliveries,l.status); } catch(e){}
}

// Demo orders
const rest1Id = db.prepare('SELECT id FROM restaurants WHERE code=?').get('REST001')?.id;
const client1Id = db.prepare('SELECT id FROM clients WHERE phone=?').get('+25377112233')?.id;
if (rest1Id && client1Id) {
  const orderStatuses = ['delivered','delivered','delivered','preparing','pending'];
  for (let i = 0; i < orderStatuses.length; i++) {
    const oid = uuid();
    const onum = 'BDJ' + String(1080 + i);
    try {
      db.prepare('INSERT OR IGNORE INTO orders (id,order_number,client_id,restaurant_id,delivery_address,subtotal,delivery_fee,total,status) VALUES (?,?,?,?,?,?,?,?,?)').run(oid,onum,client1Id,rest1Id,'Bender Djedid, Rue 12',5200,300,5500,orderStatuses[i]);
      db.prepare('INSERT OR IGNORE INTO order_items (id,order_id,menu_item_id,name,price,quantity) VALUES (?,?,?,?,?,?)').run(uuid(),oid,'x','Plateau fruits de mer',5200,1);
    } catch(e){}
  }
}

console.log('[SEED] ✅ Base de données prête !');
console.log('  Admin:      admin@boltdj.dj  /  Admin2026!');
console.log('  Restaurant: code=REST001      /  Restaurant2026!');
console.log('  Client:     +25377112233      /  OTP=1234 (DEV)');
