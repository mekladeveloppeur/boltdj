require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding BoltDj database...');
    await client.query('BEGIN');

    // ---- ADMIN ----
    const adminHash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO admins (name, email, password_hash, role)
      VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
      ['Admin BoltDj', 'admin@boltdj.dj', adminHash, 'superadmin']
    );
    console.log('✅ Admin créé  →  admin@boltdj.dj / admin123');

    // ---- RESTAURANTS ----
    const restHash = await bcrypt.hash('resto123', 10);
    const restaurants = [
      { code:'REST001', name:'La Scorpion', desc:'Spécialités de fruits de mer frais · Bender Djedid', cat:'Fruits de mer', addr:'Bender Djedid, face à la plage', quartier:'Bender Djedid', phone:'+253 77 12 34 56', mgr:'Omar Said', mgr_phone:'+253 77 12 34 56', dt_min:25, dt_max:35, status:'active', rating:4.8 },
      { code:'REST002', name:'Pizza Djibouti', desc:'Pizzas artisanales et plats italiens', cat:'Pizza', addr:'Plateau du Serpent, Rue 15', quartier:'Plateau du Serpent', phone:'+253 77 23 45 67', mgr:'Marco Rossi', mgr_phone:'+253 77 23 45 67', dt_min:20, dt_max:30, status:'active', rating:4.5 },
      { code:'REST003', name:'Burger Zone DJ', desc:'Les meilleurs burgers de Djibouti', cat:'Fast Food', addr:'Quartier 1, Avenue Maréchal', quartier:'Quartier 1', phone:'+253 77 34 56 78', mgr:'Karim Diallo', mgr_phone:'+253 77 34 56 78', dt_min:15, dt_max:25, status:'active', rating:4.3 },
      { code:'REST004', name:'Chez Mama Djibouti', desc:'Cuisine locale traditionnelle djiboutienne', cat:'Local', addr:'Quartier 7, Marché Central', quartier:'Quartier 7', phone:'+253 77 45 67 89', mgr:'Halima Hassan', mgr_phone:'+253 77 45 67 89', dt_min:30, dt_max:45, status:'active', rating:4.7 },
      { code:'REST005', name:'Le Palais du Golf', desc:'Restaurant gastronomique avec vue sur le golf', cat:'Gastronomique', addr:'Plateau du Serpent, Golf Club', quartier:'Plateau du Serpent', phone:'+253 77 56 78 90', mgr:'Ahmed Hassan', mgr_phone:'+253 77 56 78 90', dt_min:35, dt_max:50, status:'pending', rating:0 },
      { code:'REST006', name:'Shawarma Express', desc:'Shawarmas et grillades orientales', cat:'Grillades', addr:'Quartier 7, Rue de la Paix', quartier:'Quartier 7', phone:'+253 77 67 89 01', mgr:'Fatima Ali', mgr_phone:'+253 77 67 89 01', dt_min:15, dt_max:25, status:'pending', rating:0 },
    ];

    const restIds = {};
    for (const r of restaurants) {
      const res = await client.query(`
        INSERT INTO restaurants (restaurant_code,name,description,category,address,quartier,phone,manager_name,manager_phone,password_hash,delivery_time_min,delivery_time_max,status,rating,is_open)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (restaurant_code) DO UPDATE SET name=EXCLUDED.name
        RETURNING id`,
        [r.code,r.name,r.desc,r.cat,r.addr,r.quartier,r.phone,r.mgr,r.mgr_phone,restHash,r.dt_min,r.dt_max,r.status,r.rating, r.status==='active']
      );
      restIds[r.code] = res.rows[0].id;
    }
    console.log('✅ 6 restaurants créés (4 actifs, 2 en attente)');

    // ---- MENUS ----
    // Scorpion
    const scorpionId = restIds['REST001'];
    const [catEntree, catPlat, catBoisson] = await Promise.all([
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Entrées',1) RETURNING id`,[scorpionId]),
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Plats principaux',2) RETURNING id`,[scorpionId]),
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Boissons',3) RETURNING id`,[scorpionId]),
    ]);
    const items_scorpion = [
      [scorpionId, catEntree.rows[0].id, 'Salade de crabe', 'Crabe frais, avocat, citron', 1500, '🥗', true],
      [scorpionId, catEntree.rows[0].id, 'Soupe de poisson', 'Bouillon maison, légumes', 1200, '🍲', true],
      [scorpionId, catPlat.rows[0].id, 'Homard grillé', 'Homard entier, beurre à l\'ail, frites', 4500, '🦞', true],
      [scorpionId, catPlat.rows[0].id, 'Poisson braisé', 'Poisson du jour, sauce locale, riz', 2800, '🐟', true],
      [scorpionId, catPlat.rows[0].id, 'Plateau fruits de mer', 'Crevettes, calamars, poisson, riz', 5500, '🍱', false],
      [scorpionId, catBoisson.rows[0].id, 'Jus de bissap', 'Hibiscus frais', 400, '🥤', true],
      [scorpionId, catBoisson.rows[0].id, 'Eau minérale 50cl', '', 200, '💧', true],
    ];
    for (const it of items_scorpion) {
      await client.query(`INSERT INTO menu_items (restaurant_id,category_id,name,description,price,emoji,is_available) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[...it]);
    }

    // Pizza DJ
    const pizzaId = restIds['REST002'];
    const [pCat1, pCat2, pCat3] = await Promise.all([
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Pizzas',1) RETURNING id`,[pizzaId]),
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Accompagnements',2) RETURNING id`,[pizzaId]),
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Boissons',3) RETURNING id`,[pizzaId]),
    ]);
    const items_pizza = [
      [pizzaId, pCat1.rows[0].id, 'Margherita DJ', 'Tomate, mozzarella, basilic frais', 2200, '🍕', true],
      [pizzaId, pCat1.rows[0].id, 'Pizza Djiboutienne', 'Viande de chameau, harissa, fromage', 2800, '🍕', true],
      [pizzaId, pCat1.rows[0].id, 'Quattro Stagioni', 'Jambon, champignons, poivrons, olives', 2600, '🍕', true],
      [pizzaId, pCat2.rows[0].id, 'Salade César', 'Romaine, parmesan, croûtons', 900, '🥗', true],
      [pizzaId, pCat2.rows[0].id, 'Frites maison', 'Dorées et croustillantes', 700, '🍟', true],
      [pizzaId, pCat3.rows[0].id, 'Coca-Cola', '33cl', 350, '🥤', true],
      [pizzaId, pCat3.rows[0].id, 'Limonade', 'Citron frais, menthe', 400, '🍋', true],
    ];
    for (const it of items_pizza) {
      await client.query(`INSERT INTO menu_items (restaurant_id,category_id,name,description,price,emoji,is_available) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[...it]);
    }

    // Burger Zone
    const burgerId = restIds['REST003'];
    const [bCat1, bCat2, bCat3] = await Promise.all([
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Burgers',1) RETURNING id`,[burgerId]),
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Menus',2) RETURNING id`,[burgerId]),
      client.query(`INSERT INTO menu_categories (restaurant_id,name,sort_order) VALUES ($1,'Desserts',3) RETURNING id`,[burgerId]),
    ]);
    const items_burger = [
      [burgerId, bCat1.rows[0].id, 'Classic Burger', 'Steak haché, salade, tomate, cheddar', 1800, '🍔', true],
      [burgerId, bCat1.rows[0].id, 'Spicy Djibouti', 'Double steak, piment fort, sauce maison', 2400, '🌶️', true],
      [burgerId, bCat1.rows[0].id, 'Chicken Burger', 'Poulet crispy, coleslaw, cornichon', 1900, '🍗', true],
      [burgerId, bCat2.rows[0].id, 'Menu Classic', 'Burger + Frites + Boisson', 2500, '🍱', true],
      [burgerId, bCat2.rows[0].id, 'Menu XL', 'Double burger + Grandes frites + Boisson', 3200, '🍱', true],
      [burgerId, bCat3.rows[0].id, 'Milkshake vanille', 'Glace vanille, lait, chantilly', 800, '🥛', true],
      [burgerId, bCat3.rows[0].id, 'Brownie fondant', 'Chocolat noir, noix de pécan', 700, '🍫', true],
    ];
    for (const it of items_burger) {
      await client.query(`INSERT INTO menu_items (restaurant_id,category_id,name,description,price,emoji,is_available) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[...it]);
    }
    console.log('✅ Menus créés (Scorpion, Pizza, Burger)');

    // ---- CLIENTS ----
    const clients = [
      { first:'Hodan', last:'Abdi', phone:'+25377112233' },
      { first:'Yusuf', last:'Omar', phone:'+25377445566' },
      { first:'Amina', last:'Dualeh', phone:'+25377778899' },
    ];
    const clientIds = [];
    for (const c of clients) {
      const res = await client.query(`
        INSERT INTO clients (first_name,last_name,phone,is_verified)
        VALUES ($1,$2,$3,true) ON CONFLICT (phone) DO UPDATE SET first_name=EXCLUDED.first_name RETURNING id`,
        [c.first, c.last, c.phone]
      );
      clientIds.push(res.rows[0].id);
      await client.query(`
        INSERT INTO client_addresses (client_id,label,address_text,quartier,is_default)
        VALUES ($1,'Maison',$2,$3,true) ON CONFLICT DO NOTHING`,
        [res.rows[0].id, 'Bender Djedid, Rue 12', 'Bender Djedid']
      );
    }
    console.log('✅ 3 clients créés  →  OTP: 1234 (mode DEMO)');

    // ---- LIVREURS ----
    const livHash = await bcrypt.hash('livr123', 10);
    const livreurs = [
      { name:'Moussa Kamil', phone:'+25377102030', zone:'Centre-ville', rating:4.9 },
      { name:'Ibrahim Ahmed', phone:'+25377405060', zone:'Bender Djedid', rating:4.7 },
    ];
    for (const l of livreurs) {
      await client.query(`
        INSERT INTO livreurs (name,phone,password_hash,zone,rating,is_online,is_available)
        VALUES ($1,$2,$3,$4,$5,true,true) ON CONFLICT (phone) DO NOTHING`,
        [l.name, l.phone, livHash, l.zone, l.rating]
      );
    }

    // ---- SAMPLE ORDERS ----
    const orderStatuses = ['delivered','delivered','in_preparation','in_delivery'];
    for (let i = 0; i < 4; i++) {
      const num = `ORD${String(1078 + i).padStart(6,'0')}`;
      const total = [5400, 2900, 6000, 3800][i];
      const restId = [scorpionId, pizzaId, scorpionId, burgerId][i];
      await client.query(`
        INSERT INTO orders (order_number,client_id,restaurant_id,delivery_address,delivery_quartier,subtotal,delivery_fee,total,status,payment_method)
        VALUES ($1,$2,$3,$4,$5,$6,300,$7,$8,'cash')
        ON CONFLICT (order_number) DO NOTHING`,
        [num, clientIds[i%3], restId, 'Bender Djedid, Rue 12', 'Bender Djedid', total-300, total, orderStatuses[i]]
      );
    }
    console.log('✅ Livreurs et commandes exemples créés');

    await client.query('COMMIT');
    console.log('\n🎉 Seed terminé avec succès !\n');
    console.log('Comptes de connexion:');
    console.log('  Admin     → admin@boltdj.dj  / admin123  →  http://localhost:3002');
    console.log('  Restaurant→ REST001           / resto123  →  http://localhost:3003');
    console.log('  Client    → +25377112233      / OTP: 1234 →  http://localhost:3004');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
