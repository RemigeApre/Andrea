const DIRECTUS_URL = 'http://localhost:8056';
const ADMIN_EMAIL = 'andrea@simonetdavin.fr';
const ADMIN_PASSWORD = 'changeme123';

let token = '';

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${DIRECTUS_URL}${path}`, opts);
  const text = await res.text();
  if (!res.ok) {
    console.error(`${method} ${path} → ${res.status}`, text);
    return null;
  }
  return text ? JSON.parse(text) : null;
}

async function login() {
  const res = await api('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  token = res.data.access_token;
  console.log('✓ Authenticated');
}

async function createCollection(collection, fields, meta = {}) {
  const res = await api('POST', '/collections', {
    collection,
    meta: { icon: 'box', note: '', ...meta },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', meta: { hidden: true, interface: 'input', readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
      ...fields,
    ],
  });
  if (res) console.log(`✓ Collection: ${collection}`);
  return res;
}

function stringField(field, opts = {}) {
  return {
    field,
    type: 'string',
    meta: { interface: 'input', width: 'full', ...opts.meta },
    schema: { default_value: opts.default || null },
  };
}

function textField(field, opts = {}) {
  return {
    field,
    type: 'text',
    meta: { interface: 'input-multiline', width: 'full', ...opts.meta },
    schema: { default_value: opts.default || null },
  };
}

function intField(field, opts = {}) {
  return {
    field,
    type: 'integer',
    meta: { interface: 'input', width: 'half', ...opts.meta },
    schema: { default_value: opts.default || null },
  };
}

function boolField(field, opts = {}) {
  return {
    field,
    type: 'boolean',
    meta: { interface: 'boolean', width: 'half', ...opts.meta },
    schema: { default_value: opts.default || false },
  };
}

function sortField() {
  return intField('sort', { meta: { interface: 'input', hidden: true, width: 'full' } });
}

let publicPolicyId = null;

async function getPublicPolicyId() {
  if (publicPolicyId) return publicPolicyId;
  const res = await api('GET', '/policies');
  const pub = res.data.find(p => p.name === '$t:public_label' || p.name === 'Public');
  publicPolicyId = pub?.id;
  return publicPolicyId;
}

async function setPublicReadPermission(collection) {
  const policy = await getPublicPolicyId();
  await api('POST', '/permissions', {
    policy,
    collection,
    action: 'read',
    fields: ['*'],
  });
  console.log(`✓ Public read: ${collection}`);
}

async function seed() {
  await login();

  // ===== COLLECTIONS =====

  // site_info (singleton)
  await createCollection('site_info', [
    stringField('name'),
    stringField('title'),
    stringField('subtitle'),
    textField('description'),
    stringField('address'),
    stringField('phone'),
    stringField('email'),
    stringField('adeli'),
    stringField('siret'),
    stringField('doctolib_url', { meta: { interface: 'input', width: 'full' } }),
    stringField('welcome_title'),
    textField('welcome_text'),
    textField('formation_text'),
    textField('approches_intro'),
    textField('approches_detail'),
    textField('remboursement_text'),
  ], { singleton: true, icon: 'info' });

  // services
  await createCollection('services', [
    stringField('name'),
    stringField('description'),
    textField('icon'),
    sortField(),
  ], { icon: 'medical_services', sort_field: 'sort' });

  // approches
  await createCollection('approches', [
    stringField('name'),
    textField('description'),
    sortField(),
  ], { icon: 'psychology', sort_field: 'sort' });

  // publics
  await createCollection('publics', [
    stringField('name'),
    sortField(),
  ], { icon: 'groups', sort_field: 'sort' });

  // motifs
  await createCollection('motifs', [
    stringField('name'),
    sortField(),
  ], { icon: 'healing', sort_field: 'sort' });

  // tarifs
  await createCollection('tarifs', [
    stringField('label'),
    intField('price_min'),
    intField('price_max'),
    textField('description'),
    sortField(),
  ], { icon: 'euro', sort_field: 'sort' });

  // moyens_paiement
  await createCollection('moyens_paiement', [
    stringField('name'),
    sortField(),
  ], { icon: 'payments', sort_field: 'sort' });

  // horaires
  await createCollection('horaires', [
    stringField('day'),
    stringField('open_time'),
    stringField('close_time'),
    boolField('is_closed'),
    sortField(),
  ], { icon: 'schedule', sort_field: 'sort' });

  // deontologie_principes
  await createCollection('deontologie_principes', [
    stringField('title'),
    textField('description'),
    sortField(),
  ], { icon: 'gavel', sort_field: 'sort' });

  // planning (private, no public access)
  await createCollection('planning', [
    stringField('title'),
    { field: 'date', type: 'date', meta: { interface: 'datetime', width: 'half' }, schema: {} },
    stringField('start_time'),
    stringField('end_time'),
    stringField('type', { meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Rendez-vous', value: 'rdv' }, { text: 'Bloqué', value: 'blocked' }, { text: 'Note', value: 'note' }] } } }),
    stringField('patient_name'),
    textField('notes'),
    stringField('status', { default: 'pending', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'En attente', value: 'pending' }, { text: 'Confirmé', value: 'confirmed' }, { text: 'Annulé', value: 'cancelled' }] } } }),
  ], { icon: 'calendar_today' });

  // ===== PUBLIC PERMISSIONS =====
  const publicCollections = ['site_info', 'services', 'approches', 'publics', 'motifs', 'tarifs', 'moyens_paiement', 'horaires', 'deontologie_principes'];
  for (const col of publicCollections) {
    await setPublicReadPermission(col);
  }

  // ===== SEED DATA =====

  // site_info (singleton — PATCH since the row already exists)
  await api('PATCH', '/items/site_info', {
    name: 'Andrea Simonet-Davin',
    title: 'Psychologue à Canet-en-Roussillon',
    subtitle: 'Psychologue diplômée',
    description: 'Thérapie intégrative, systémique, TCC · Outils EMDR, Hypnose, Somatothérapie et Cohérence cardiaque. Un espace d\'écoute bienveillant pour vous accompagner vers un mieux-être durable.',
    address: '168 Av. Edouard Herriot, 66140 Canet-en-Roussillon',
    phone: '06 69 35 09 12',
    email: 'simonet.davin@gmail.com',
    adeli: '10111639034',
    siret: '99330485600012',
    doctolib_url: 'https://www.doctolib.fr/psychologue/canet-en-roussillon/andrea-simonet-davin',
    welcome_title: 'Bienvenue',
    welcome_text: 'Je vous accueille dans un cadre chaleureux et confidentiel, adapté à vos besoins et à votre rythme.\n\nQue vous traversiez une période difficile, que vous souhaitiez mieux vous comprendre ou que vous cherchiez à améliorer vos relations, je vous propose un accompagnement personnalisé. Mon approche intégrative me permet de combiner différents outils thérapeutiques pour répondre au mieux à votre situation.\n\nJ\'accompagne les enfants, adolescents, adultes, couples, familles, seniors et personnes LGBTQ+ avec la même attention et le même respect.',
    formation_text: 'Titulaire d\'un Master II de Psychologie obtenu à l\'Université de Lausanne (UNIL), en Suisse, en 2020, je suis psychologue clinicienne inscrite au registre ADELI sous le numéro 10111639034.\n\nInstallée à Canet-en-Roussillon, je mets mes compétences au service d\'un accompagnement thérapeutique respectueux, adapté à chaque personne. Mon approche intégrative me permet de puiser dans plusieurs courants pour proposer une prise en charge sur mesure.',
    approches_intro: 'Je m\'appuie sur une variété d\'outils et de méthodes, que j\'adapte en fonction de vos besoins et de votre sensibilité :',
    approches_detail: 'La thérapie intégrative consiste à combiner différentes approches psychothérapeutiques pour offrir un accompagnement personnalisé. Plutôt que de m\'inscrire dans un seul courant, je choisis les outils les plus pertinents en fonction de votre situation et de vos objectifs.\n\nL\'approche systémique permet de comprendre les dynamiques relationnelles et familiales. Les TCC aident à identifier et modifier les pensées et comportements source de souffrance. L\'EMDR est un outil puissant pour le traitement des traumatismes. L\'hypnose, la somatothérapie et la cohérence cardiaque apportent des ressources complémentaires pour le corps et l\'esprit.',
    remboursement_text: 'Les consultations chez un psychologue libéral ne sont pas remboursées par la Sécurité sociale. Cependant, de plus en plus de mutuelles et complémentaires santé proposent une prise en charge partielle des séances de psychologie.\n\nUne facture vous sera remise à chaque séance pour faciliter vos démarches de remboursement auprès de votre complémentaire santé.',
  });
  console.log('✓ Seed: site_info');

  // services
  const services = [
    { name: 'À domicile', description: 'Je me déplace chez vous pour des consultations dans le confort de votre environnement.', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', sort: 1 },
    { name: 'En visio', description: 'Des séances en visioconférence, accessibles où que vous soyez, en toute confidentialité.', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', sort: 2 },
    { name: 'En entreprise', description: 'Interventions en milieu professionnel pour le bien-être et la gestion du stress au travail.', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', sort: 3 },
  ];
  for (const s of services) {
    await api('POST', '/items/services', s);
  }
  console.log('✓ Seed: services');

  // approches
  const approches = ['Thérapie intégrative', 'Thérapie systémique', 'TCC (Thérapies cognitivo-comportementales)', 'EMDR', 'Hypnose', 'Somatothérapie', 'Cohérence cardiaque'];
  for (let i = 0; i < approches.length; i++) {
    await api('POST', '/items/approches', { name: approches[i], sort: i + 1 });
  }
  console.log('✓ Seed: approches');

  // publics
  const publics = ['Enfants', 'Adolescents', 'Adultes', 'Couples', 'Familles', 'Seniors', 'LGBTQ+'];
  for (let i = 0; i < publics.length; i++) {
    await api('POST', '/items/publics', { name: publics[i], sort: i + 1 });
  }
  console.log('✓ Seed: publics');

  // motifs
  const motifs = ['Problématiques féminines', 'Conflits famille / travail', 'Troubles du sommeil', 'Gestion du stress', 'Confiance en soi', 'Dépression', 'Anxiété'];
  for (let i = 0; i < motifs.length; i++) {
    await api('POST', '/items/motifs', { name: motifs[i], sort: i + 1 });
  }
  console.log('✓ Seed: motifs');

  // tarifs
  await api('POST', '/items/tarifs', { label: 'Séance', price_min: 70, price_max: 80, description: 'Consultation psychologique (à domicile, en visio ou en entreprise)', sort: 1 });
  console.log('✓ Seed: tarifs');

  // moyens_paiement
  const paiements = ['Espèces', 'Carte bancaire', 'Paiement en ligne', 'PayPal'];
  for (let i = 0; i < paiements.length; i++) {
    await api('POST', '/items/moyens_paiement', { name: paiements[i], sort: i + 1 });
  }
  console.log('✓ Seed: moyens_paiement');

  // horaires
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  for (let i = 0; i < jours.length; i++) {
    const isClosed = jours[i] === 'Dimanche';
    await api('POST', '/items/horaires', {
      day: jours[i],
      open_time: isClosed ? null : '09:00',
      close_time: isClosed ? null : '22:30',
      is_closed: isClosed,
      sort: i + 1,
    });
  }
  console.log('✓ Seed: horaires');

  // deontologie_principes
  const principes = [
    { title: 'Respect de la personne et de sa dignité', description: 'Je respecte chaque personne dans sa singularité, ses valeurs, ses choix et sa dignité. Quels que soient votre âge, votre origine, votre orientation ou votre situation, vous êtes accueilli(e) avec le même respect et la même considération.' },
    { title: 'Compétence', description: 'Je m\'engage à maintenir et développer mes compétences professionnelles par la formation continue et la supervision. Mon titre de psychologue est garanti par mon diplôme (Master II, UNIL 2020) et mon inscription ADELI.' },
    { title: 'Responsabilité et autonomie professionnelle', description: 'J\'assume la responsabilité de mes actes professionnels et exerce en toute indépendance. Mes recommandations et interventions sont guidées uniquement par l\'intérêt de la personne accompagnée.' },
    { title: 'Rigueur et intégrité', description: 'Ma pratique repose sur des fondements scientifiques et des méthodes validées. Je m\'engage à faire preuve d\'honnêteté dans ma communication et à distinguer clairement les données scientifiques de mes interprétations cliniques.' },
    { title: 'Respect du but assigné', description: 'Je veille à ce que la psychologie soit utilisée conformément à ses finalités : le bien-être et le développement des personnes. Je refuse tout usage détourné de mes compétences ou de mes outils.' },
    { title: 'Respect de la confidentialité', description: 'Le secret professionnel est au cœur de ma pratique. Tout ce qui est partagé en séance reste strictement confidentiel. Cette garantie de confidentialité est essentielle pour créer un espace de parole sûr et libre.' },
  ];
  for (let i = 0; i < principes.length; i++) {
    await api('POST', '/items/deontologie_principes', { ...principes[i], sort: i + 1 });
  }
  console.log('✓ Seed: deontologie_principes');

  console.log('\n🎉 Seed complete!');
}

seed().catch(console.error);
