/* ============================================================
   AMOUR JEWELS — Product Catalog (single source of truth)
   ============================================================ */

const IMG = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const CATEGORIES = {
  hand:      { label: 'Hand Accessories', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80' },
  necklaces: { label: 'Necklaces | Chokers', img: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=900&q=80' },
  earrings:  { label: 'Earrings', img: 'https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=900&q=80' },
  bracelets: { label: 'Bangles | Kadas', img: 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?auto=format&fit=crop&w=900&q=80' },
  hair:      { label: 'Hair Accessories', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80' },
  groom:     { label: "Groom's Jewellery", img: 'https://images.unsplash.com/photo-1610694955371-d4a3e0ce4b52?auto=format&fit=crop&w=900&q=80' },
  brooches:  { label: 'Brooches & Kalangi', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80' },
  rings:     { label: 'Rings', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80' },
  pearls:    { label: 'Pearls', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80' },
  diamond:   { label: 'Diamond Jewellery', img: 'images/cat-diamond.jpg' },
  everyday:  { label: 'Everyday Gold', img: 'https://images.unsplash.com/photo-1610694955371-d4a3e0ce4b52?auto=format&fit=crop&w=900&q=80' }
};

/* Curated order for the Shop All dropdown — new labels first, no counts shown */
const NAV_CATEGORIES = ['hand', 'necklaces', 'earrings', 'bracelets', 'hair', 'groom', 'brooches', 'diamond'];

const PRODUCTS = [
  {
    id: 'mehrunisa-necklace-set',
    name: 'Mehrunisa Necklace Set',
    sku: 'AJ-NK-040',
    cat: ['necklaces'],
    collection: 'new',
    price: 33700, mrp: 33700,
    tag: 'New', rating: 0, reviews: 0,
    img: './images/mehrunisa-necklace-set-1.jpg',
    alt: './images/mehrunisa-necklace-set-2.jpg',
    desc: 'A timeless treasure, crafted for moments that deserve to be remembered. Includes necklace &amp; a pair of earrings. Discover the art of adornment with Amour Jewels.',
    details: [
      'Includes: necklace &amp; pair of earrings',
      'Hand-set kundan-style stones in ruby, sapphire and emerald tones',
      'Pearl and green onyx-style drops for a regal bridal finish',
      'Presented in the signature Amour keepsake box'
    ],
    sizes: null
  },
  {
    id: 'sunehri-statement-ear-chains',
    name: 'Sunehri Statement Ear Chains',
    sku: 'AJ-EA-040',
    cat: ['earrings', 'hair'],
    collection: 'new',
    price: 7999, mrp: 7999,
    tag: 'New', rating: 0, reviews: 0,
    img: './images/sunehri-ear-chains-1.jpg',
    alt: './images/sunehri-ear-chains-2.jpg',
    desc: '8 layers of pure elegance. Style tip: pair them with a sleek bun or a traditional braid for an effortlessly royal look.',
    details: [
      '8 layers of pearls and beaded drops in a single statement piece',
      'Pairs with a sleek bun or a traditional braid',
      'Handcrafted in gold-tone finish with pearl and green bead detailing',
      'Presented in the signature Amour keepsake box'
    ],
    sizes: null
  },
  {
    id: 'noor-maang-tika',
    name: 'Noor Maang Tika',
    sku: 'AJ-HR-040',
    cat: ['hair'],
    collection: 'new',
    price: 8900, mrp: 8900,
    tag: 'New', rating: 0, reviews: 0,
    img: './images/noor-maang-tika-1.jpg',
    alt: './images/noor-maang-tika-2.jpg',
    desc: 'A statement showstopper maang tika. Because some jewels are made to steal the spotlight.',
    details: [
      'Statement maang tika with pearl and kundan detailing',
      'Handcrafted in gold-tone finish with jade-green and ruby accents',
      'Presented in the signature Amour keepsake box'
    ],
    sizes: null
  },
  {
    id: 'rajwada-antique-choker-set',
    name: 'Rajwada Antique Choker Set',
    sku: 'AJ-NK-011',
    cat: ['necklaces'],
    collection: 'bridal',
    price: 12450, mrp: 15950,
    tag: 'Bestseller', rating: 4.9, reviews: 212,
    img: IMG('1601121141461-9d6647bca1ed', 900),
    alt: IMG('1633934542430-0905ccb5f050', 900),
    desc: 'A museum-grade reproduction of a 1940s bridal choker, hand-cast in antique gold and set with ruby-red crystal drops. Comes with matching stud earrings.',
    details: [
      'Brass core, finished in 2-micron antique gold plating',
      'Hand-set ruby crystal stones with pearl drop detailing',
      'Adjustable cotton dori — fits 12″ to 14″ neck circumference',
      'Set weight approx. 96 g · nickel-free &amp; lead-free',
      'Presented in the signature Amour keepsake box'
    ],
    sizes: null
  },
  {
    id: 'chandra-layered-necklace',
    name: 'Chandra Layered Pendant Necklace',
    sku: 'AJ-NK-024',
    cat: ['necklaces', 'everyday'],
    collection: 'new',
    price: 4850, mrp: 6200,
    tag: 'New', rating: 4.8, reviews: 64,
    img: IMG('1599643478518-a784e5dc4c8f', 900),
    alt: IMG('1599459183200-59c7687a0275', 900),
    desc: 'Two strands, one story — a faceted london-blue topaz sits above a hand-set crescent, strung on a delicate 18k-vermeil chain. Designed to sit beautifully over kurtas and linen alike.',
    details: [
      '92.5 sterling silver, plated in 1-micron 18k gold vermeil',
      'Faceted london blue topaz + white sapphire crescent',
      'Adjustable slider — wears 16″ to 18″',
      'Layered strands pre-joined; no tangling',
      'Weight approx. 9 g'
    ],
    sizes: null
  },
  {
    id: 'moti-classic-pearl-strand',
    name: 'Moti Classic Pearl Strand',
    sku: 'AJ-PR-007',
    cat: ['pearls', 'necklaces'],
    collection: 'core',
    price: 5800, mrp: 7400,
    tag: null, rating: 4.7, reviews: 158,
    img: IMG('1515562141207-7a88fb7ce338', 900),
    alt: IMG('1611085583191-a3b181a88401', 900),
    desc: 'Hand-knotted freshwater pearls with a crystal-rondelle clasp — the strand your grandmother wore, reimagined at a length that layers as easily as it stands alone.',
    details: [
      'Freshwater button pearls, 8–9 mm, hand-knotted on silk cord',
      'Crystal-rondelle clasp in 18k gold vermeil',
      'Standard 18″ length · custom lengths on request',
      'Each strand unique in lustre and shape',
      'Comes with pearl-care card and pouch'
    ],
    sizes: null
  },
  {
    id: 'aaroha-halo-solitaire-ring',
    name: 'Aaroha Halo Solitaire Ring',
    sku: 'AJ-RG-019',
    cat: ['rings'],
    collection: 'bridal',
    price: 8900, mrp: 11200,
    tag: 'Bestseller', rating: 4.9, reviews: 187,
    img: IMG('1605100804763-247f67b3557e', 900),
    alt: IMG('1603561591411-07134e71a2a9', 900),
    desc: 'A 1.1 ct moissanite solitaire framed by a milgrain halo, set on a split band. The ring that photographs like a proposal — without the diamond invoice.',
    details: [
      'D-colour VVS moissanite centre, 1.1 ct equivalent',
      '92.5 sterling silver with rose-gold tone halo, rhodium band',
      'Milgrain hand-engraving on the halo',
      'Band width 1.8 mm · court profile for comfort',
      'Includes certificate of authenticity'
    ],
    sizes: [6, 7, 8, 9]
  },
  {
    id: 'zoya-chunky-hoops',
    name: 'Zoya Chunky Gold Hoops',
    sku: 'AJ-ER-002',
    cat: ['earrings', 'everyday'],
    collection: 'core',
    price: 3450, mrp: 4200,
    tag: 'Bestseller', rating: 4.8, reviews: 341,
    img: IMG('1617038220319-276d3cfab638', 900),
    alt: IMG('1617038260897-41a1f14a8ca0', 900),
    desc: 'Our most-worn pair — sculptural twisted hoops with real weight and a hinge that never snags. Office on Monday, mehendi on Saturday.',
    details: [
      'Brass core, plated in 2-micron 18k gold',
      'Twisted rope silhouette, high-polish finish',
      'Secure hinge closure — no fiddly butterfly backs',
      'Medium: 24 mm diameter · weight 7 g per pair',
      'Hypoallergenic posts; safe for sensitive ears'
    ],
    sizes: null
  },
  {
    id: 'maya-twist-hoops',
    name: 'Maya Twist Hoops',
    sku: 'AJ-ER-014',
    cat: ['earrings', 'everyday'],
    collection: 'new',
    price: 2980, mrp: 3800,
    tag: 'New', rating: 4.7, reviews: 58,
    img: IMG('1617038260897-41a1f14a8ca0', 900),
    alt: IMG('1522337660859-02fbefca4702', 900),
    desc: 'A softer, smaller take on the Zoya — rose-gold warmth that flatters every skin tone and disappears into your ears-by-7pm routine.',
    details: [
      'Brass core, rose-gold toned 18k plating',
      'Petite: 18 mm diameter · weight 5 g per pair',
      'Hinge closure, water-resistant finish',
      'Hand-buffed for a mirror shine',
      'Nickel-free'
    ],
    sizes: null
  },
  {
    id: 'nilaa-statement-earrings',
    name: 'Nilaa Statement Drop Earrings',
    sku: 'AJ-ER-021',
    cat: ['earrings'],
    collection: 'new',
    price: 5200, mrp: 6800,
    tag: 'New', rating: 4.8, reviews: 41,
    img: IMG('1535632066927-ab7c9ab60908', 900),
    alt: IMG('1512163143273-bde0e3cc7407', 900),
    desc: 'Victorian arcs in oxidised silver with a sapphire-blue teardrop centre — the pair that carries a plain saree all the way to the front row.',
    details: [
      'Oxidised 92.5 sterling silver',
      'Sapphire crystal teardrop with opal glass accents',
      'Length 64 mm · weight 12 g per piece',
      'Comfort posts with silicone stabilisers',
      'Limited batch of 80 pieces'
    ],
    sizes: null
  },
  {
    id: 'falak-crystal-heart-drops',
    name: 'Falak Crystal Heart Drops',
    sku: 'AJ-ER-033',
    cat: ['earrings', 'everyday'],
    collection: 'core',
    price: 2350, mrp: 2900,
    tag: null, rating: 4.6, reviews: 97,
    img: IMG('1630019852942-f89202989a59', 900),
    alt: IMG('1608042314453-ae338d80c427', 900),
    desc: 'Austrian-cut crystal hearts on feather-light hooks — the under-₹2.5k pair our DMs are full of. Gift-boxed as standard.',
    details: [
      'Gold-tone brass hooks, Austrian-cut crystal hearts',
      'Length 34 mm · weight 3 g per piece',
      'Hypoallergenic hook wire',
      'Arrives gift-ready — no wrapping needed',
      'Also loved as a bridesmaid present'
    ],
    sizes: null
  },
  {
    id: 'sitara-layered-chain-set',
    name: 'Sitaara Layered Chain Set',
    sku: 'AJ-NK-018',
    cat: ['necklaces', 'everyday'],
    collection: 'core',
    price: 4250, mrp: 5400,
    tag: 'Bestseller', rating: 4.8, reviews: 129,
    img: IMG('1601821765780-754fa98637c1', 900),
    alt: IMG('1596944924616-7b38e7cfac36', 900),
    desc: 'Three chains, one clasp — bead, cable and rolo strands finished with a star-charmed drop. The layering look, minus the layering work.',
    details: [
      '92.5 sterling silver, 1-micron 18k gold vermeil',
      'Three graduated strands (14″, 16″, 18″) on a single clasp',
      'Star charm drop with white sapphire',
      'Weight 11 g · tangle-free design',
      'Water-resistant finish'
    ],
    sizes: null
  },
  {
    id: 'sona-pave-kada',
    name: 'Sona Pavé Kada',
    sku: 'AJ-BR-009',
    cat: ['bracelets'],
    collection: 'bridal',
    price: 9400, mrp: 12500,
    tag: 'Bestseller', rating: 4.9, reviews: 176,
    img: IMG('1611591437281-460bfbe1220a', 900),
    alt: IMG('1601121141461-9d6647bca1ed', 900),
    desc: 'A hand-pavé kada in warm champagne gold — 212 stones set face by face. Worn in stacks of one.',
    details: [
      'Brass core, champagne-gold 2-micron plating',
      '212 hand-set cubic zirconia in a paisley flow',
      'Screw-open hinge with safety clasp',
      'Choose bangle size at checkout (2.4 / 2.6 / 2.8)',
      'Sold as a single kada; pair for the full look'
    ],
    sizes: ['2.4', '2.6', '2.8']
  },
  {
    id: 'vera-curb-chain-bracelet',
    name: 'Vera Curb Chain Bracelet',
    sku: 'AJ-BR-017',
    cat: ['bracelets', 'everyday'],
    collection: 'core',
    price: 3900, mrp: 4900,
    tag: null, rating: 4.7, reviews: 83,
    img: IMG('1602173574767-37ac01994b2a', 900),
    alt: IMG('1596944924616-7b38e7cfac36', 900),
    desc: 'A chunky curb-link chain that reads solid gold in every mirror. Unisex, weighty, zero-maintenance.',
    details: [
      'Brass core, heavy 18k gold plating (2 micron)',
      '8 mm curb links, 7.5″ length with 1″ extender',
      'Lobster clasp, water-resistant finish',
      'Weight 22 g — substantial but easy',
      'Unisex styling'
    ],
    sizes: null
  },
  {
    id: 'tanvi-cz-line-bracelet',
    name: 'Tanvi CZ Line Bracelet',
    sku: 'AJ-BR-022',
    cat: ['bracelets'],
    collection: 'core',
    price: 7200, mrp: 9100,
    tag: null, rating: 4.8, reviews: 112,
    img: IMG('1573408301185-9146fe634ad0', 900),
    alt: IMG('1605100804763-247f67b3557e', 900),
    desc: 'An endless ribbon of rhodium-set zircons — the tennis look for sangeet nights and silver-anniversary dinners alike.',
    details: [
      '92.5 sterling silver, rhodium finish',
      '3.4 ct total weight in precision-cut CZ',
      'Double safety clasp — you will not lose this',
      'Fits 6.5″ to 7.5″ wrists',
      'Certificate of authenticity included'
    ],
    sizes: null
  },
  {
    id: 'dhara-stacking-rings',
    name: 'Dhara Stone Stacking Rings',
    sku: 'AJ-RG-008',
    cat: ['rings', 'everyday'],
    collection: 'new',
    price: 3900, mrp: 4700,
    tag: 'New', rating: 4.6, reviews: 49,
    img: IMG('1608042314453-ae338d80c427', 900),
    alt: IMG('1596944924616-7b38e7cfac36', 900),
    desc: 'A trio of stackables — turquoise howlite, coral and a mirrored signet — sold as a set of three. Stack them your way.',
    details: [
      'Set of three rings, 18k gold vermeil over 92.5 silver',
      'Turquoise howlite, red coral composite, gold mirror signet',
      'Band width 2 mm each · comfortable daily profile',
      'Mix sizes across the set (mention at checkout)',
      'Arrives in a three-slot travel case'
    ],
    sizes: [6, 7, 8, 9]
  },
  {
    id: 'gulaab-halo-ring',
    name: 'Gulaab Pink Halo Ring',
    sku: 'AJ-RG-025',
    cat: ['rings'],
    collection: 'bridal',
    price: 6900, mrp: 8600,
    tag: null, rating: 4.8, reviews: 74,
    img: IMG('1603561591411-07134e71a2a9', 900),
    alt: IMG('1605100804763-247f67b3557e', 900),
    desc: 'A rose-tinted zircon cushion framed in pavé — for the bride who wants colour where everyone expects white.',
    details: [
      'Pink moissanite-look cushion centre, 2 ct equivalent',
      'Rose-gold vermeil halo over 92.5 silver band',
      'Pavé shoulders with 38 accent stones',
      'Band width 2 mm · court profile',
      'Certificate of authenticity included'
    ],
    sizes: [6, 7, 8, 9]
  },
  {
    id: 'shubh-pave-band',
    name: 'Shubh Pavé Band',
    sku: 'AJ-RG-031',
    cat: ['rings'],
    collection: 'core',
    price: 5400, mrp: 6600,
    tag: null, rating: 4.7, reviews: 66,
    img: IMG('1589674781759-c21c37956a44', 900),
    alt: IMG('1573408301185-9146fe634ad0', 900),
    desc: 'A crossover pavé band in cool rhodium — worn alone by minimalists, stacked by the rest of us.',
    details: [
      '92.5 sterling silver, rhodium plated',
      'Crossover silhouette, 42 channel-set CZ',
      'Band width 4.5 mm at the crossover',
      'Sizes 6–9 · free resizing within 30 days',
      'Hand-finished in India'
    ],
    sizes: [6, 7, 8, 9]
  },
  {
    id: 'ira-baroque-pearl-pendant',
    name: 'Ira Baroque Pearl Pendant',
    sku: 'AJ-PR-012',
    cat: ['pearls', 'necklaces', 'everyday'],
    collection: 'new',
    price: 3200, mrp: 4100,
    tag: 'New', rating: 4.9, reviews: 88,
    img: IMG('1611085583191-a3b181a88401', 900),
    alt: IMG('1610030469983-98e550d6193c', 900),
    desc: 'One baroque pearl, chosen for its shape, hung on a whisper-thin chain. No two are alike — yours picks you.',
    details: [
      'Freshwater baroque pearl, 10–12 mm',
      '92.5 silver chain in 18k gold vermeil, 16″ + 2″ extender',
      'Hand-selected lustre; each piece one-of-a-kind',
      'Weight 4 g — forget-it-is-on comfort',
      'Pearl care card included'
    ],
    sizes: null
  },
  {
    id: 'dil-coin-locket',
    name: 'Dil Coin Locket Necklace',
    sku: 'AJ-NK-029',
    cat: ['necklaces', 'everyday'],
    collection: 'core',
    price: 4600, mrp: 5900,
    tag: null, rating: 4.7, reviews: 121,
    img: IMG('1610694955371-d4a3e0ce4b52', 900),
    alt: IMG('1602173574767-37ac01994b2a', 900),
    desc: 'A hand-hammered medallion engraved with the word Amour — our founder’s first design, still our most gifted.',
    details: [
      'Hand-hammered brass medallion, 18k gold plating',
      '‘Amour’ script engraving on the face, motifs on reverse',
      '16″ chain with 2″ extender, lobster clasp',
      'Weight 8 g · water-resistant finish',
      'Free initial engraving on the reverse'
    ],
    sizes: null
  }
];

/*@APPEND@*/
