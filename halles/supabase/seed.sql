-- =============================================================================
-- Halles — jeu de démonstration
-- =============================================================================
-- Un hôtel publié, 25 lieux, 8 avantages, 2 itinéraires : de quoi voir un guide
-- complet dès la fin de l'installation.
--
-- Les établissements sont FICTIFS, à des adresses et coordonnées réelles du
-- Marais. Aucun commerçant réel n'est associé ici à un avantage qu'il n'a pas
-- négocié — ne pas remplacer ces noms par des enseignes existantes tant que
-- l'accord n'est pas signé.
--
-- Idempotent : `on conflict do nothing` sur des UUID fixes, rejouable sans risque.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- HÔTEL DÉMO
-- -----------------------------------------------------------------------------
insert into hotels (
  id, slug, name, city, address, lat, lng, rooms_count,
  primary_color, default_locale,
  wifi_name, wifi_password, breakfast_info, checkin_info, checkout_info,
  transport_info, contact_whatsapp, contact_phone, custom_blocks, status
) values (
  'a0000000-0000-4000-8000-000000000001',
  'lemarais',
  'Hôtel Sainte-Croix',
  'Paris',
  '18 rue Sainte-Croix de la Bretonnerie, 75004 Paris',
  48.858370, 2.355200, 34,
  '#2f4b3f', 'fr',
  'Sainte-Croix Guests', 'bonjour2026',
  'Petit-déjeuner servi de 7 h à 10 h 30 dans la salle voûtée du rez-de-chaussée. 14 € par personne, en supplément.',
  'Arrivée à partir de 15 h. Réception ouverte 24 h/24.',
  'Départ avant 11 h. Bagagerie gratuite le jour du départ.',
  'Métro Hôtel de Ville (lignes 1 et 11) à 4 minutes à pied. Rambuteau (ligne 11) à 5 minutes. Station Vélib'' au 25 rue du Temple.',
  '+33600000000', '+33142000000',
  '[{"title":"Parapluies","body":"Des parapluies sont à votre disposition à la réception, sans supplément.","icon":"umbrella"},{"title":"Pressing","body":"Dépôt avant 9 h, retour le lendemain soir. Tarifs affichés à la réception.","icon":"shirt"}]'::jsonb,
  'published'
) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- LIEUX — 25 adresses du Marais et alentours
-- -----------------------------------------------------------------------------
insert into places (
  id, city, name, category, address, lat, lng, price_range,
  short_desc_fr, short_desc_en, long_desc_fr, long_desc_en,
  phone, website, booking_url, instagram, opening_hours, photo_url, tags, status, verified_at
) values

-- --- Restaurants ---
('b0000000-0000-4000-8000-000000000001','Paris','Le Comptoir des Archives','restaurant',
 '32 rue des Archives, 75004 Paris', 48.858020, 2.355900, 2,
 'Bistrot de quartier, ardoise qui change chaque jour.',
 'Neighbourhood bistro with a daily changing chalkboard menu.',
 'Une salle étroite, vingt-huit couverts, une ardoise réécrite chaque matin selon le marché. La cuisine est française sans détour : un poisson, une viande, un plat végétarien. On y va pour dîner tôt, vers 19 h 30, avant que la file ne se forme sur le trottoir.',
 'A narrow room, twenty-eight seats, and a chalkboard rewritten each morning around whatever the market offered. Straightforward French cooking: one fish, one meat, one vegetarian dish. Come early, around 7.30pm, before the queue forms on the pavement.',
 '+33142720001', 'https://exemple.fr/comptoir-archives', null, 'comptoirdesarchives',
 '{"mon":[],"tue":[["12:00","14:30"],["19:00","22:30"]],"wed":[["12:00","14:30"],["19:00","22:30"]],"thu":[["12:00","14:30"],["19:00","22:30"]],"fri":[["12:00","14:30"],["19:00","23:00"]],"sat":[["19:00","23:00"]],"sun":[]}'::jsonb,
 null, '{"terrasse","sans-resa"}', 'published', '2026-06-12'),

('b0000000-0000-4000-8000-000000000002','Paris','Table Sainte-Croix','restaurant',
 '9 rue Sainte-Croix de la Bretonnerie, 75004 Paris', 48.858600, 2.354600, 3,
 'Cuisine du sud-ouest, salle voûtée du XVIIe.',
 'South-west French cooking under a 17th-century vaulted ceiling.',
 'Sous les voûtes d''une ancienne cave à vin, une cuisine du Sud-Ouest tenue par la même famille depuis 1998. Canard, haricots tarbais, pruneaux à l''armagnac. Portions généreuses, service qui prend le temps. Réservation vivement conseillée le week-end.',
 'Under the vaults of a former wine cellar, south-western cooking run by the same family since 1998. Duck, tarbais beans, prunes in armagnac. Generous portions, unhurried service. Book ahead at weekends.',
 '+33142720002', 'https://exemple.fr/table-sainte-croix', 'https://exemple.fr/table-sainte-croix/reserver', null,
 '{"mon":[["19:00","22:30"]],"tue":[["19:00","22:30"]],"wed":[["19:00","22:30"]],"thu":[["19:00","22:30"]],"fri":[["19:00","23:00"]],"sat":[["12:00","14:30"],["19:00","23:00"]],"sun":[["12:00","15:00"]]}'::jsonb,
 null, '{"enfants"}', 'published', '2026-06-12'),

('b0000000-0000-4000-8000-000000000003','Paris','Kubo','restaurant',
 '4 rue de Braque, 75003 Paris', 48.861200, 2.357800, 2,
 'Comptoir japonais, quinze places, poisson du jour.',
 'Japanese counter, fifteen seats, fish of the day.',
 'Quinze tabourets face au comptoir, aucun menu écrit : le chef annonce ce qu''il a trouvé le matin à Rungis. Compter une heure trente, pas plus — le service tourne. Pas de réservation, on inscrit son prénom sur le carnet à l''entrée.',
 'Fifteen stools facing the counter and no written menu: the chef announces whatever he found at Rungis that morning. Allow ninety minutes, no more. No bookings — write your name in the notebook by the door.',
 '+33142720003', null, null, 'kubo.paris',
 '{"mon":[],"tue":[["19:00","22:00"]],"wed":[["19:00","22:00"]],"thu":[["19:00","22:00"]],"fri":[["19:00","22:30"]],"sat":[["19:00","22:30"]],"sun":[]}'::jsonb,
 null, '{"sans-resa","tardif"}', 'published', '2026-05-30'),

('b0000000-0000-4000-8000-000000000004','Paris','Chez Perrine','restaurant',
 '21 rue du Roi de Sicile, 75004 Paris', 48.856900, 2.358400, 1,
 'Cantine familiale, plat du jour à 14 €.',
 'Family canteen, daily special at €14.',
 'Une cantine sans manières où l''on mange pour moins de vingt euros. Nappes en papier, plat du jour affiché à la craie sur la vitrine, une carafe d''eau posée sans qu''on la demande. Bondé entre 12 h 30 et 13 h 30 : venir avant ou après.',
 'An unfussy canteen where you eat for under twenty euros. Paper tablecloths, the day''s dish chalked on the window, a carafe of water brought without asking. Packed between 12.30 and 1.30pm — come before or after.',
 '+33142720004', null, null, null,
 '{"mon":[["12:00","15:00"]],"tue":[["12:00","15:00"]],"wed":[["12:00","15:00"]],"thu":[["12:00","15:00"]],"fri":[["12:00","15:00"]],"sat":[],"sun":[]}'::jsonb,
 null, '{"sans-resa","enfants"}', 'published', '2026-06-01'),

('b0000000-0000-4000-8000-000000000005','Paris','Verger','restaurant',
 '55 rue Charlot, 75003 Paris', 48.863100, 2.362400, 3,
 'Entièrement végétal, produits d''Île-de-France.',
 'Fully plant-based, produce from the Paris region.',
 'Cuisine entièrement végétale, sans militantisme affiché : les légumes viennent de quatre fermes d''Île-de-France et la carte change toutes les trois semaines. Menu en cinq services le soir, formule courte le midi. Belle carte de vins nature.',
 'Fully plant-based cooking without the lecture: vegetables from four farms around Paris, menu rewritten every three weeks. Five-course tasting menu in the evening, a shorter set lunch. Good natural wine list.',
 '+33142720005', 'https://exemple.fr/verger', 'https://exemple.fr/verger/reserver', 'verger.paris',
 '{"mon":[],"tue":[],"wed":[["12:00","14:00"],["19:30","22:00"]],"thu":[["12:00","14:00"],["19:30","22:00"]],"fri":[["12:00","14:00"],["19:30","22:30"]],"sat":[["19:30","22:30"]],"sun":[["12:00","15:00"]]}'::jsonb,
 null, '{"vegan","terrasse"}', 'published', '2026-06-20'),

-- --- Bars ---
('b0000000-0000-4000-8000-000000000006','Paris','Le Petit Temple','bar',
 '78 rue du Temple, 75003 Paris', 48.861000, 2.356300, 2,
 'Bar à vins nature, planches de charcuterie.',
 'Natural wine bar with charcuterie boards.',
 'Trente références au verre, ardoise renouvelée chaque semaine, et un patron qui fait goûter avant de servir. On y mange une planche debout au comptoir ou assis sur les trois tables du fond. Ça se remplit vers 19 h.',
 'Thirty wines by the glass, a list rewritten weekly, and an owner who lets you taste before pouring. Eat a charcuterie board standing at the bar or at one of the three tables at the back. Fills up around 7pm.',
 '+33142720006', null, null, 'lepetittemple',
 '{"mon":[["17:00","00:00"]],"tue":[["17:00","00:00"]],"wed":[["17:00","00:00"]],"thu":[["17:00","01:00"]],"fri":[["17:00","02:00"]],"sat":[["17:00","02:00"]],"sun":[]}'::jsonb,
 null, '{"tardif","sans-resa"}', 'published', '2026-06-12'),

('b0000000-0000-4000-8000-000000000007','Paris','Bar des Rosiers','bar',
 '14 rue des Rosiers, 75004 Paris', 48.857400, 2.359600, 2,
 'Cocktails classiques, sans esbroufe.',
 'Classic cocktails, no theatrics.',
 'Une dizaine de cocktails classiques exécutés correctement, dans une salle qui n''a pas changé depuis vingt ans. Pas de fumée, pas de pince à épiler : un negroni, un daiquiri, une conversation. Dernier service à 1 h.',
 'A dozen classic cocktails made properly, in a room unchanged for twenty years. No smoke, no tweezers: a negroni, a daiquiri, a conversation. Last orders at 1am.',
 '+33142720007', null, null, null,
 '{"mon":[],"tue":[["18:00","01:00"]],"wed":[["18:00","01:00"]],"thu":[["18:00","02:00"]],"fri":[["18:00","02:00"]],"sat":[["18:00","02:00"]],"sun":[["18:00","00:00"]]}'::jsonb,
 null, '{"tardif"}', 'published', '2026-05-28'),

('b0000000-0000-4000-8000-000000000008','Paris','Brasserie du Pont-Marie','bar',
 '2 rue de l''Hôtel de Ville, 75004 Paris', 48.854300, 2.357700, 2,
 'Grande terrasse au bord de la Seine.',
 'Large terrace by the Seine.',
 'Le genre de brasserie où l''on s''assoit sans regarder la carte, pour une bière et la vue sur l''île Saint-Louis. La cuisine est correcte sans plus ; la terrasse, elle, vaut le détour au coucher du soleil.',
 'The kind of brasserie where you sit down without reading the menu, for a beer and the view of the Île Saint-Louis. The food is fine; the terrace at sunset is the reason to come.',
 '+33142720008', null, null, null,
 '{"mon":[["08:00","01:00"]],"tue":[["08:00","01:00"]],"wed":[["08:00","01:00"]],"thu":[["08:00","01:00"]],"fri":[["08:00","02:00"]],"sat":[["08:00","02:00"]],"sun":[["08:00","01:00"]]}'::jsonb,
 null, '{"terrasse","sans-resa","enfants"}', 'published', '2026-06-05'),

-- --- Cafés ---
('b0000000-0000-4000-8000-000000000009','Paris','Torréfaction Barbette','cafe',
 '11 rue Barbette, 75003 Paris', 48.859300, 2.360100, 1,
 'Torréfacteur, filtre et espresso à emporter.',
 'Roastery serving filter and espresso to take away.',
 'On torréfie dans l''arrière-boutique deux fois par semaine, l''odeur se sent depuis le trottoir. Quatre tabourets seulement : c''est un endroit où l''on prend son café et où l''on repart marcher.',
 'They roast in the back room twice a week and you can smell it from the pavement. Only four stools: this is a place to take your coffee and keep walking.',
 '+33142720009', 'https://exemple.fr/barbette', null, 'torrefaction.barbette',
 '{"mon":[["08:00","18:00"]],"tue":[["08:00","18:00"]],"wed":[["08:00","18:00"]],"thu":[["08:00","18:00"]],"fri":[["08:00","18:00"]],"sat":[["09:00","19:00"]],"sun":[["09:00","17:00"]]}'::jsonb,
 null, '{"sans-resa","vegan"}', 'published', '2026-06-18'),

('b0000000-0000-4000-8000-000000000010','Paris','Café des Blancs-Manteaux','cafe',
 '25 rue des Blancs-Manteaux, 75004 Paris', 48.858800, 2.357300, 1,
 'Café de quartier, terrasse au soleil du matin.',
 'Neighbourhood café, morning sun on the terrace.',
 'Un café de quartier comme il en reste peu dans le Marais : comptoir en zinc, habitués qui lisent le journal, croissants livrés à 7 h. La terrasse prend le soleil jusqu''à midi.',
 'A neighbourhood café of a kind now rare in the Marais: zinc counter, regulars with newspapers, croissants delivered at 7am. The terrace gets sun until noon.',
 '+33142720010', null, null, null,
 '{"mon":[["07:00","20:00"]],"tue":[["07:00","20:00"]],"wed":[["07:00","20:00"]],"thu":[["07:00","20:00"]],"fri":[["07:00","20:00"]],"sat":[["08:00","20:00"]],"sun":[["08:00","14:00"]]}'::jsonb,
 null, '{"terrasse","sans-resa","enfants"}', 'published', '2026-06-02'),

('b0000000-0000-4000-8000-000000000011','Paris','Le Salon de Bretagne','cafe',
 '38 rue de Turenne, 75003 Paris', 48.858100, 2.364500, 2,
 'Salon de thé, quarante thés, pâtisseries maison.',
 'Tea room, forty teas, house-made pastries.',
 'Une adresse calme pour l''après-midi, avec quarante thés en vrac et des pâtisseries faites sur place. Le seul endroit du quartier où l''on peut lire deux heures sans qu''on vous demande de libérer la table.',
 'A quiet afternoon address with forty loose-leaf teas and pastries made on site. The only place nearby where you can read for two hours without being asked to free the table.',
 '+33142720011', null, null, null,
 '{"mon":[],"tue":[["12:00","19:00"]],"wed":[["12:00","19:00"]],"thu":[["12:00","19:00"]],"fri":[["12:00","19:00"]],"sat":[["11:00","19:30"]],"sun":[["11:00","19:30"]]}'::jsonb,
 null, '{"enfants"}', 'published', '2026-05-20'),

-- --- Boulangeries ---
('b0000000-0000-4000-8000-000000000012','Paris','Fournil Sainte-Anastase','boulangerie',
 '6 rue Sainte-Anastase, 75003 Paris', 48.859900, 2.363000, 1,
 'Levain naturel, fournée de 17 h.',
 'Naturally leavened bread, second bake at 5pm.',
 'Pain au levain, farines de meule, une seconde fournée à 17 h pour ceux qui rentrent tard. La baguette de tradition part avant 10 h le dimanche.',
 'Sourdough, stone-milled flour, and a second bake at 5pm for anyone getting back late. The tradition baguette sells out before 10am on Sundays.',
 '+33142720012', null, null, null,
 '{"mon":[],"tue":[["07:00","20:00"]],"wed":[["07:00","20:00"]],"thu":[["07:00","20:00"]],"fri":[["07:00","20:00"]],"sat":[["07:00","20:00"]],"sun":[["07:00","14:00"]]}'::jsonb,
 null, '{"sans-resa"}', 'published', '2026-06-15'),

('b0000000-0000-4000-8000-000000000013','Paris','Maison Volta','boulangerie',
 '3 rue Volta, 75003 Paris', 48.866200, 2.357100, 1,
 'Viennoiseries au beurre, kouign-amann réputé.',
 'Butter pastries; the kouign-amann is the one to get.',
 'Petite boulangerie du Haut-Marais dont le kouign-amann se vend jusqu''au dernier avant midi. Les viennoiseries sont au beurre de baratte, ça se sent.',
 'A small bakery in the upper Marais whose kouign-amann sells out before noon. The pastries are made with churned butter, and it shows.',
 '+33142720013', null, null, 'maisonvolta',
 '{"mon":[["07:00","19:30"]],"tue":[["07:00","19:30"]],"wed":[["07:00","19:30"]],"thu":[["07:00","19:30"]],"fri":[["07:00","19:30"]],"sat":[["07:00","19:30"]],"sun":[]}'::jsonb,
 null, '{"sans-resa"}', 'published', '2026-04-10'),

-- --- Brunch ---
('b0000000-0000-4000-8000-000000000014','Paris','Dimanche Matin','brunch',
 '17 rue de Poitou, 75003 Paris', 48.862400, 2.363100, 2,
 'Brunch servi du vendredi au dimanche, sans réservation.',
 'Brunch Friday to Sunday, walk-ins only.',
 'Œufs pochés, pain de la boulangerie d''à côté, jus pressé devant vous. On ne réserve pas : on donne son prénom et on attend au comptoir avec un café. Compter vingt minutes d''attente vers 11 h 30.',
 'Poached eggs, bread from the bakery next door, juice pressed in front of you. No bookings: leave your name and wait at the counter with a coffee. Expect a twenty-minute wait around 11.30am.',
 '+33142720014', null, null, 'dimanchematin.paris',
 '{"mon":[],"tue":[],"wed":[],"thu":[],"fri":[["09:00","15:00"]],"sat":[["09:00","16:00"]],"sun":[["09:00","16:00"]]}'::jsonb,
 null, '{"sans-resa","enfants","vegan"}', 'published', '2026-06-21'),

('b0000000-0000-4000-8000-000000000015','Paris','La Table Longue','brunch',
 '44 rue de Saintonge, 75003 Paris', 48.862900, 2.363700, 2,
 'Grande table partagée, brunch tous les jours.',
 'One long shared table, brunch every day.',
 'Une seule grande table de vingt places, où l''on s''assoit à côté d''inconnus. Brunch servi tous les jours jusqu''à 15 h, avec une formule unique. Convient bien aux voyageurs seuls.',
 'A single twenty-seat table where you sit next to strangers. Brunch served daily until 3pm, one set formula. Good for solo travellers.',
 '+33142720015', 'https://exemple.fr/table-longue', null, null,
 '{"mon":[["09:30","15:00"]],"tue":[["09:30","15:00"]],"wed":[["09:30","15:00"]],"thu":[["09:30","15:00"]],"fri":[["09:30","15:00"]],"sat":[["09:30","16:00"]],"sun":[["09:30","16:00"]]}'::jsonb,
 null, '{"enfants","vegan"}', 'published', '2026-06-08'),

-- --- Culture ---
('b0000000-0000-4000-8000-000000000016','Paris','Musée Carnavalet','culture',
 '23 rue de Sévigné, 75003 Paris', 48.857500, 2.362700, null,
 'L''histoire de Paris, collection permanente gratuite.',
 'The history of Paris; permanent collection free of charge.',
 'L''histoire de Paris depuis la préhistoire, dans deux hôtels particuliers reliés par un jardin. La collection permanente est gratuite. Deux heures suffisent si l''on va droit aux salles de la Révolution.',
 'The history of Paris from prehistory onwards, across two mansions joined by a garden. The permanent collection is free. Two hours is enough if you head straight for the Revolution rooms.',
 '+33144595858', 'https://www.carnavalet.paris.fr', null, null,
 '{"mon":[],"tue":[["10:00","18:00"]],"wed":[["10:00","18:00"]],"thu":[["10:00","18:00"]],"fri":[["10:00","18:00"]],"sat":[["10:00","18:00"]],"sun":[["10:00","18:00"]]}'::jsonb,
 null, '{"enfants","pluie"}', 'published', '2026-06-25'),

('b0000000-0000-4000-8000-000000000017','Paris','Galerie Perreau','culture',
 '9 rue Debelleyme, 75003 Paris', 48.861600, 2.363000, null,
 'Galerie d''art contemporain, entrée libre.',
 'Contemporary art gallery, free entry.',
 'Une galerie sur deux niveaux, six expositions par an, entrée libre. Le personnel laisse tranquille et répond volontiers si on demande. Vernissages le jeudi soir, ouverts à tous.',
 'A two-floor gallery with six shows a year and free entry. Staff leave you alone and answer gladly if asked. Openings on Thursday evenings, everyone welcome.',
 '+33142720017', 'https://exemple.fr/galerie-perreau', null, 'galerieperreau',
 '{"mon":[],"tue":[["11:00","19:00"]],"wed":[["11:00","19:00"]],"thu":[["11:00","21:00"]],"fri":[["11:00","19:00"]],"sat":[["11:00","19:00"]],"sun":[]}'::jsonb,
 null, '{"pluie"}', 'published', '2026-06-19'),

('b0000000-0000-4000-8000-000000000018','Paris','Cinéma Saint-Paul','culture',
 '73 rue Saint-Antoine, 75004 Paris', 48.854800, 2.362000, 2,
 'Trois salles, films en version originale.',
 'Three screens, films in their original language.',
 'Trois petites salles, programmation en version originale sous-titrée, séances jusqu''à 22 h 30. Les fauteuils datent, la programmation rattrape largement.',
 'Three small screens, everything in the original language with subtitles, last shows at 10.30pm. The seats have seen better days; the programming more than makes up for it.',
 '+33142720018', 'https://exemple.fr/cinema-saint-paul', null, null,
 '{"mon":[["14:00","22:30"]],"tue":[["14:00","22:30"]],"wed":[["11:00","22:30"]],"thu":[["14:00","22:30"]],"fri":[["14:00","23:00"]],"sat":[["11:00","23:00"]],"sun":[["11:00","22:00"]]}'::jsonb,
 null, '{"pluie","tardif"}', 'published', '2026-05-15'),

-- --- Shopping ---
('b0000000-0000-4000-8000-000000000019','Paris','Papeterie Guénégaud','shopping',
 '5 rue Guénégaud, 75003 Paris', 48.860700, 2.359000, 2,
 'Papiers, carnets et encres, depuis 1954.',
 'Paper, notebooks and inks, since 1954.',
 'Papiers marbrés, carnets cousus main, encres en flacon. Une boutique d''un autre siècle où l''on entre pour dix minutes et où l''on reste une heure.',
 'Marbled papers, hand-sewn notebooks, bottled inks. A shop from another century: you go in for ten minutes and stay an hour.',
 '+33142720019', null, null, null,
 '{"mon":[],"tue":[["11:00","19:00"]],"wed":[["11:00","19:00"]],"thu":[["11:00","19:00"]],"fri":[["11:00","19:00"]],"sat":[["11:00","19:00"]],"sun":[]}'::jsonb,
 null, '{"pluie"}', 'published', '2026-06-10'),

('b0000000-0000-4000-8000-000000000020','Paris','Fripe Charlot','shopping',
 '62 rue Charlot, 75003 Paris', 48.863400, 2.362800, 2,
 'Friperie triée, pièces des années 60 à 90.',
 'Curated vintage, 1960s to 1990s.',
 'Une friperie triée, pas un bac à fouiller : deux cents pièces sélectionnées, des années 60 aux années 90. Les prix sont affichés, la retouche est offerte sur place.',
 'Curated vintage rather than a bin to rummage through: two hundred selected pieces from the 60s to the 90s. Prices are marked and alterations are done on site at no charge.',
 '+33142720020', null, null, 'fripecharlot',
 '{"mon":[["13:00","19:30"]],"tue":[["13:00","19:30"]],"wed":[["13:00","19:30"]],"thu":[["13:00","19:30"]],"fri":[["13:00","19:30"]],"sat":[["12:00","20:00"]],"sun":[["14:00","19:00"]]}'::jsonb,
 null, '{"pluie"}', 'published', '2026-06-14'),

('b0000000-0000-4000-8000-000000000021','Paris','Marché des Enfants Rouges','shopping',
 '39 rue de Bretagne, 75003 Paris', 48.862900, 2.362100, 1,
 'Le plus vieux marché couvert de Paris (1615).',
 'The oldest covered market in Paris (1615).',
 'Le plus vieux marché couvert de Paris, ouvert en 1615. Maraîchers, traiteurs du monde entier et quelques tables serrées. À midi c''est bondé : y aller vers 11 h ou après 14 h.',
 'The oldest covered market in Paris, opened in 1615. Greengrocers, food stalls from all over, and a few tightly packed tables. Rammed at lunchtime — go around 11am or after 2pm.',
 null, null, null, null,
 '{"mon":[],"tue":[["08:30","20:30"]],"wed":[["08:30","20:30"]],"thu":[["08:30","20:30"]],"fri":[["08:30","20:30"]],"sat":[["08:30","20:30"]],"sun":[["08:30","17:00"]]}'::jsonb,
 null, '{"pluie","enfants","sans-resa"}', 'published', '2026-06-25'),

-- --- Balades ---
('b0000000-0000-4000-8000-000000000022','Paris','Place des Vosges','balade',
 'Place des Vosges, 75004 Paris', 48.855600, 2.365500, null,
 'La plus ancienne place de Paris, arcades et pelouses.',
 'The oldest square in Paris: arcades and lawns.',
 'Trente-six pavillons de brique rose autour d''un carré de pelouses. On fait le tour sous les arcades quand il pleut, on s''assoit sur l''herbe quand il fait beau. Le jardin ferme à la tombée de la nuit.',
 'Thirty-six pink-brick pavilions around a square of lawns. Walk the arcades when it rains, sit on the grass when it doesn''t. The garden closes at dusk.',
 null, null, null, null,
 '{"mon":[["08:00","21:00"]],"tue":[["08:00","21:00"]],"wed":[["08:00","21:00"]],"thu":[["08:00","21:00"]],"fri":[["08:00","21:00"]],"sat":[["08:00","21:00"]],"sun":[["08:00","21:00"]]}'::jsonb,
 null, '{"enfants","terrasse"}', 'published', '2026-06-25'),

('b0000000-0000-4000-8000-000000000023','Paris','Jardin de l''Hôtel de Sully','balade',
 '62 rue Saint-Antoine, 75004 Paris', 48.854900, 2.364300, null,
 'Passage discret entre Saint-Antoine et la place des Vosges.',
 'A quiet shortcut between Saint-Antoine and the Place des Vosges.',
 'Un jardin à la française coincé entre deux hôtels particuliers, et surtout un passage discret qui débouche directement sur la place des Vosges. Presque personne ne le connaît, alors qu''il est ouvert à tous.',
 'A formal garden wedged between two mansions, and above all a discreet passage that comes out directly on the Place des Vosges. Almost nobody knows it, though it is open to everyone.',
 null, null, null, null,
 '{"mon":[["09:00","19:00"]],"tue":[["09:00","19:00"]],"wed":[["09:00","19:00"]],"thu":[["09:00","19:00"]],"fri":[["09:00","19:00"]],"sat":[["09:00","19:00"]],"sun":[["09:00","19:00"]]}'::jsonb,
 null, '{"enfants"}', 'published', '2026-06-25'),

-- --- Pratique ---
('b0000000-0000-4000-8000-000000000024','Paris','Pharmacie du Temple','pratique',
 '84 rue du Temple, 75003 Paris', 48.861500, 2.356100, null,
 'Pharmacie ouverte tard, personnel anglophone.',
 'Late-opening pharmacy, English-speaking staff.',
 'Ouverte jusqu''à 21 h en semaine, personnel anglophone. La plus proche de l''hôtel pour un dépannage du soir.',
 'Open until 9pm on weekdays with English-speaking staff. The closest option to the hotel for an evening emergency.',
 '+33142720024', null, null, null,
 '{"mon":[["08:30","21:00"]],"tue":[["08:30","21:00"]],"wed":[["08:30","21:00"]],"thu":[["08:30","21:00"]],"fri":[["08:30","21:00"]],"sat":[["09:00","20:00"]],"sun":[["10:00","13:00"]]}'::jsonb,
 null, '{}', 'published', '2026-06-25'),

-- --- Nuit ---
('b0000000-0000-4000-8000-000000000025','Paris','Le Sous-Sol','nuit',
 '12 rue Michel le Comte, 75003 Paris', 48.861800, 2.355000, 2,
 'Cave voûtée, concerts jazz du jeudi au samedi.',
 'Vaulted cellar, jazz sets Thursday to Saturday.',
 'Une cave voûtée sous un immeuble du XVIIe, concerts de jazz à 21 h 30 du jeudi au samedi. Cinquante places, entrée à prix libre le jeudi. Le son est meilleur au fond à gauche.',
 'A vaulted cellar under a 17th-century building, jazz sets at 9.30pm Thursday to Saturday. Fifty seats, pay-what-you-like on Thursdays. The sound is best at the back left.',
 '+33142720025', 'https://exemple.fr/le-sous-sol', null, 'lesoussol.jazz',
 '{"mon":[],"tue":[],"wed":[],"thu":[["20:00","01:00"]],"fri":[["20:00","02:00"]],"sat":[["20:00","02:00"]],"sun":[]}'::jsonb,
 null, '{"tardif","pluie"}', 'published', '2026-06-11')

on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- AVANTAGES NÉGOCIÉS — 8 offres actives
-- -----------------------------------------------------------------------------
insert into perks (
  id, place_id, title_fr, title_en, description_fr, description_en,
  conditions_fr, conditions_en, valid_from, valid_until, status
) values

('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
 'Apéritif offert', 'Complimentary aperitif',
 'Un verre de vin ou un kir offert à chaque convive avant le repas.',
 'A glass of wine or a kir offered to each guest before the meal.',
 'Valable au dîner uniquement, hors vendredi et samedi. Un verre par personne. À signaler avant la commande.',
 'Dinner service only, excluding Friday and Saturday. One glass per person. Mention before ordering.',
 '2026-01-01', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002',
 '-10 % sur l''addition', '10% off the bill',
 'Dix pour cent de remise sur le total, boissons comprises.',
 'Ten percent off the total, drinks included.',
 'Hors menus de groupe et hors 24 et 31 décembre. Une remise par table. À présenter avant l''arrivée de l''addition.',
 'Excludes group menus and 24 and 31 December. One discount per table. Show before the bill arrives.',
 '2026-01-01', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000005',
 'Dessert offert', 'Complimentary dessert',
 'Le dessert du jour offert pour deux menus commandés.',
 'The dessert of the day, free with two set menus ordered.',
 'Valable midi et soir, du mercredi au dimanche. Un dessert pour deux menus. Sur présentation de l''écran avant la commande.',
 'Lunch and dinner, Wednesday to Sunday. One dessert per two set menus. Show this screen before ordering.',
 '2026-03-01', '2026-11-30', 'published'),

('c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000006',
 'Deuxième verre à moitié prix', 'Second glass half price',
 'Le deuxième verre de vin à moitié prix, sur toute la carte au verre.',
 'Second glass of wine at half price, across the by-the-glass list.',
 'Du lundi au jeudi, avant 20 h. Un avantage par personne et par soirée.',
 'Monday to Thursday, before 8pm. One per person per evening.',
 '2026-02-01', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000009',
 'Café filtre offert', 'Free filter coffee',
 'Un café filtre offert pour tout achat de café en grains.',
 'A filter coffee offered with any purchase of coffee beans.',
 'Un par jour et par personne. Sur place uniquement.',
 'One per person per day. In-store only.',
 '2026-01-15', '2026-12-31', 'published'),

('c0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000014',
 'Jus pressé offert', 'Free fresh juice',
 'Un jus pressé offert avec chaque brunch complet.',
 'A fresh juice offered with every full brunch.',
 'Vendredi, samedi et dimanche. Un jus par brunch commandé. À signaler à la prise de commande.',
 'Friday, Saturday and Sunday. One juice per brunch ordered. Mention when ordering.',
 '2026-04-01', '2026-10-31', 'published'),

('c0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000020',
 '-15 % sur la boutique', '15% off in store',
 'Quinze pour cent de remise sur l''ensemble des pièces.',
 'Fifteen percent off everything in store.',
 'Hors périodes de soldes. Non cumulable avec une autre remise. Une utilisation par séjour.',
 'Excludes sale periods. Not combinable with other discounts. One use per stay.',
 '2026-01-01', '2026-08-31', 'published'),

('c0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000025',
 'Entrée au tarif réduit', 'Reduced entry',
 'Entrée au tarif réduit pour les concerts du jeudi et du vendredi.',
 'Reduced entry for Thursday and Friday concerts.',
 'Dans la limite des places disponibles. Deux entrées maximum. Réservation conseillée par téléphone.',
 'Subject to availability. Maximum two entries. Phoning ahead is advised.',
 '2026-01-01', '2026-12-31', 'published')

on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- CURATION — les 25 lieux rattachés à l'hôtel démo
-- `position` croissante = ordre d'affichage. 4 lieux en avant.
-- -----------------------------------------------------------------------------
insert into hotel_places (hotel_id, place_id, position, is_featured, hotel_note_fr, hotel_note_en) values
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001', 10, true,
 'Notre cantine à nous. Dites que vous venez de l''hôtel, Marc vous gardera une table près de la fenêtre.',
 'Our own canteen. Say you are staying with us and Marc will keep you a table by the window.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000006', 20, true,
 'En remontant la rue du Temple. Le patron fait goûter avant de servir : laissez-vous guider plutôt que de choisir.',
 'Just up the rue du Temple. The owner lets you taste before pouring — let him choose for you.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000012', 30, true,
 'La fournée de 17 h vaut le détour si vous rentrez tard. Le pain aux noix part très vite.',
 'The 5pm bake is worth timing your return for. The walnut bread goes fast.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000023', 40, true,
 'Notre raccourci préféré vers la place des Vosges. Traversez le jardin, la porte du fond est ouverte à tous.',
 'Our favourite shortcut to the Place des Vosges. Cross the garden; the far door is open to everyone.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002', 50, false,
 'Pour un dîner qui dure. Réservez, surtout le samedi.',
 'For a long dinner. Book ahead, especially on Saturdays.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003', 60, false,
 'Quinze places seulement : passez inscrire votre prénom en fin d''après-midi.',
 'Only fifteen seats: drop by in the late afternoon to leave your name.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004', 70, false,
 'Le midi, pour manger vite et bien sans se ruiner. Évitez 12 h 30.',
 'Lunch, quick and good and cheap. Avoid 12.30pm.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005', 80, false,
 'Même si vous n''êtes pas végétarien. Le menu du soir est ce qui se fait de mieux dans le quartier.',
 'Even if you are not vegetarian. The evening menu is the best thing in the neighbourhood.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000007', 90, false,
 'Pour un dernier verre calme, sans musique forte.',
 'For a quiet last drink, without loud music.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000008', 100, false,
 'La cuisine est ordinaire, la terrasse au coucher du soleil ne l''est pas.',
 'The food is ordinary; the terrace at sunset is not.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000009', 110, false,
 'Le meilleur café du quartier, à emporter. Quatre tabourets, pas plus.',
 'The best coffee nearby, to take away. Four stools, no more.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000010', 120, false,
 'Si vous préférez petit-déjeuner dehors : la terrasse a le soleil du matin.',
 'If you would rather have breakfast out: the terrace gets the morning sun.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000011', 130, false,
 'Un après-midi de pluie s''y passe très bien.',
 'A rainy afternoon passes well here.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000013', 140, false,
 'Un peu plus loin, mais le kouign-amann justifie les dix minutes de marche.',
 'A little further, but the kouign-amann justifies the ten-minute walk.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000014', 150, false,
 'Notre adresse du dimanche. Arrivez à 9 h ou après 14 h.',
 'Our Sunday address. Arrive at 9am or after 2pm.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000015', 160, false,
 'La grande table partagée : agréable quand on voyage seul.',
 'The long shared table: good when travelling alone.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000016', 170, false,
 'Collection permanente gratuite, à sept minutes. Commencez par le deuxième étage.',
 'Free permanent collection, seven minutes away. Start on the second floor.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000017', 180, false,
 'Entrée libre, on peut y passer vingt minutes sans culpabiliser.',
 'Free entry; twenty minutes is a perfectly respectable visit.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000018', 190, false,
 'Films en version originale, à six minutes à pied.',
 'Films in their original language, six minutes on foot.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000019', 200, false,
 'Pour rapporter autre chose qu''un aimant de frigo.',
 'For bringing home something other than a fridge magnet.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000020', 210, false,
 'Friperie sérieusement triée. La retouche est offerte sur place.',
 'Properly curated vintage. Alterations are done on site at no charge.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000021', 220, false,
 'Le marché couvert de 1615. Idéal un midi de pluie.',
 'The covered market from 1615. Ideal on a rainy lunchtime.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000022', 230, false,
 'Cinq minutes par la rue de Turenne. Les arcades restent sèches quand il pleut.',
 'Five minutes via the rue de Turenne. The arcades stay dry when it rains.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000024', 240, false,
 'La pharmacie la plus proche, ouverte jusqu''à 21 h.',
 'The nearest pharmacy, open until 9pm.'),
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000025', 250, false,
 'Concerts à 21 h 30. Demandez une place au fond à gauche, le son y est meilleur.',
 'Sets at 9.30pm. Ask for a seat at the back left, where the sound is best.')
on conflict (hotel_id, place_id) do nothing;

-- -----------------------------------------------------------------------------
-- ITINÉRAIRES
-- -----------------------------------------------------------------------------
insert into itineraries (
  id, city, hotel_id, title_fr, title_en, description_fr, description_en,
  duration_minutes, tags, steps, status
) values

('d0000000-0000-4000-8000-000000000001','Paris', null,
 'Le Marais en une demi-journée', 'The Marais in half a day',
 'Une boucle de trois kilomètres qui part du café du coin et finit devant un verre, en passant par le plus vieux marché couvert de Paris.',
 'A three-kilometre loop that starts with a coffee and ends with a drink, by way of the oldest covered market in Paris.',
 240, '{"demi-journee","enfants"}',
 '[
   {"place_id":"b0000000-0000-4000-8000-000000000009","order":1,"note_fr":"Commencez par un filtre, à emporter : la boutique ne compte que quatre tabourets.","note_en":"Start with a filter coffee to take away — the shop has only four stools."},
   {"place_id":"b0000000-0000-4000-8000-000000000016","order":2,"note_fr":"Deux heures suffisent. Montez directement au deuxième étage.","note_en":"Two hours is plenty. Go straight to the second floor."},
   {"place_id":"b0000000-0000-4000-8000-000000000021","order":3,"note_fr":"Déjeuner debout au marché. Vers 11 h ou après 14 h, jamais à midi.","note_en":"Lunch standing at the market. Around 11am or after 2pm, never at noon."},
   {"place_id":"b0000000-0000-4000-8000-000000000022","order":4,"note_fr":"Faites le tour sous les arcades, puis asseyez-vous sur la pelouse.","note_en":"Walk the arcades, then sit on the grass."},
   {"place_id":"b0000000-0000-4000-8000-000000000023","order":5,"note_fr":"Sortez par le jardin de Sully : le passage du fond ramène rue Saint-Antoine.","note_en":"Leave through the Sully garden: the passage at the back leads back to the rue Saint-Antoine."},
   {"place_id":"b0000000-0000-4000-8000-000000000006","order":6,"note_fr":"Terminez au comptoir. Votre avantage : deuxième verre à moitié prix avant 20 h.","note_en":"Finish at the bar. Your perk: second glass half price before 8pm."}
 ]'::jsonb,
 'published'),

('d0000000-0000-4000-8000-000000000002','Paris','a0000000-0000-4000-8000-000000000001',
 'Une soirée dans le Haut-Marais', 'An evening in the upper Marais',
 'Trois arrêts en trois quarts d''heure de marche, de l''apéritif au concert de minuit.',
 'Three stops within forty-five minutes of walking, from aperitif to a midnight set.',
 210, '{"soir","pluie"}',
 '[
   {"place_id":"b0000000-0000-4000-8000-000000000006","order":1,"note_fr":"Apéritif à 18 h 30, avant que le comptoir ne se remplisse.","note_en":"Aperitif at 6.30pm, before the bar fills up."},
   {"place_id":"b0000000-0000-4000-8000-000000000005","order":2,"note_fr":"Dîner à 19 h 30. Le dessert du jour vous est offert pour deux menus.","note_en":"Dinner at 7.30pm. The dessert of the day is on the house with two set menus."},
   {"place_id":"b0000000-0000-4000-8000-000000000025","order":3,"note_fr":"Concert à 21 h 30, du jeudi au samedi. Tarif réduit avec votre avantage.","note_en":"Set at 9.30pm, Thursday to Saturday. Reduced entry with your perk."}
 ]'::jsonb,
 'published')

on conflict (id) do nothing;
