/**
 * Area utilities for mapping between area names and URL slugs
 */

export const DUBLIN_AREAS = [
  { name: 'Dublin 1', slug: 'dublin-1', district: 1 },
  { name: 'Dublin 2', slug: 'dublin-2', district: 2 },
  { name: 'Dublin 3', slug: 'dublin-3', district: 3 },
  { name: 'Dublin 4', slug: 'dublin-4', district: 4 },
  { name: 'Dublin 5', slug: 'dublin-5', district: 5 },
  { name: 'Dublin 6', slug: 'dublin-6', district: 6 },
  { name: 'Dublin 6w', slug: 'dublin-6w', district: 6 },
  { name: 'Dublin6w', slug: 'dublin6w', district: 6 },
  { name: 'Dublin 7', slug: 'dublin-7', district: 7 },
  { name: 'Dublin 8', slug: 'dublin-8', district: 8 },
  { name: 'Dublin 9', slug: 'dublin-9', district: 9 },
  { name: 'Dublin 10', slug: 'dublin-10', district: 10 },
  { name: 'Dublin 11', slug: 'dublin-11', district: 11 },
  { name: 'Dublin 12', slug: 'dublin-12', district: 12 },
  { name: 'Dublin 13', slug: 'dublin-13', district: 13 },
  { name: 'Dublin13', slug: 'dublin13', district: 13 },
  { name: 'Dublin 14', slug: 'dublin-14', district: 14 },
  { name: 'Dublin 15', slug: 'dublin-15', district: 15 },
  { name: 'Dublin15', slug: 'dublin15', district: 15 },
  { name: 'Dublin 16', slug: 'dublin-16', district: 16 },
  { name: 'Dublin16', slug: 'dublin16', district: 16 },
  { name: 'Dublin 17', slug: 'dublin-17', district: 17 },
  { name: 'Dublin 18', slug: 'dublin-18', district: 18 },
  { name: 'Dublin18', slug: 'dublin18', district: 18 },
  { name: 'Dublin 20', slug: 'dublin-20', district: 20 },
  { name: 'Dublin 22', slug: 'dublin-22', district: 22 },
  { name: 'Dublin 24', slug: 'dublin-24', district: 24 },
  { name: 'Dublin24', slug: 'dublin24', district: 24 },
  
  // Named areas (neighborhoods with sufficient data)
  { name: 'Adamstown', slug: 'adamstown', district: null },
  { name: 'Addison Park Dublin 11', slug: 'addison-park-dublin-11', district: 11 },
  { name: 'Aikens Village Dublin 18', slug: 'aikens-village-dublin-18', district: 18 },
  { name: 'Arbour Hill Dublin 7', slug: 'arbour-hill-dublin-7', district: 7 },
  { name: 'Artane Dublin 5', slug: 'artane-dublin-5', district: 5 },
  { name: 'Ashtown', slug: 'ashtown', district: null },
  { name: 'Ashtown Dublin 15', slug: 'ashtown-dublin-15', district: 15 },
  { name: 'Ashtown Rd Dublin 15', slug: 'ashtown-rd-dublin-15', district: 15 },
  { name: 'Ayrfield Dublin 13', slug: 'ayrfield-dublin-13', district: 13 },
  { name: 'Balbriggan', slug: 'balbriggan', district: null },
  { name: 'Baldoyle', slug: 'baldoyle', district: null },
  { name: 'Baldoyle Dublin 13', slug: 'baldoyle-dublin-13', district: 13 },
  { name: 'Balgriffin', slug: 'balgriffin', district: null },
  { name: 'Balgriffin Dublin 13', slug: 'balgriffin-dublin-13', district: 13 },
  { name: 'Ballinteer', slug: 'ballinteer', district: null },
  { name: 'Ballinteer Dublin 16', slug: 'ballinteer-dublin-16', district: 16 },
  { name: 'Ballsbridge', slug: 'ballsbridge', district: null },
  { name: 'Ballsbridge Dublin 4', slug: 'ballsbridge-dublin-4', district: 4 },
  { name: 'Ballyboughal', slug: 'ballyboughal', district: null },
  { name: 'Ballybrack', slug: 'ballybrack', district: null },
  { name: 'Ballycullen', slug: 'ballycullen', district: null },
  { name: 'Ballycullen Dublin 24', slug: 'ballycullen-dublin-24', district: 24 },
  { name: 'Ballycullen Rd Dublin 24', slug: 'ballycullen-rd-dublin-24', district: 24 },
  { name: 'Ballyfermot Dublin 10', slug: 'ballyfermot-dublin-10', district: 10 },
  { name: 'Ballymun', slug: 'ballymun', district: null },
  { name: 'Ballymun Dublin 11', slug: 'ballymun-dublin-11', district: 11 },
  { name: 'Ballymun Dublin 9', slug: 'ballymun-dublin-9', district: 9 },
  { name: 'Barrow St Dublin 4', slug: 'barrow-st-dublin-4', district: 4 },
  { name: 'Barrow Street', slug: 'barrow-street', district: null },
  { name: 'Beacon South Quarter Dublin 18', slug: 'beacon-south-quarter-dublin-18', district: 18 },
  { name: 'Beaumont Dublin 9', slug: 'beaumont-dublin-9', district: 9 },
  { name: 'Beaumont Woods Dublin 9', slug: 'beaumont-woods-dublin-9', district: 9 },
  { name: 'Blackglen Rd Dublin 18', slug: 'blackglen-rd-dublin-18', district: 18 },
  { name: 'Blackrock', slug: 'blackrock', district: null },
  { name: 'Blackthorn Rd Dublin 18', slug: 'blackthorn-rd-dublin-18', district: 18 },
  { name: 'Blanchardstown', slug: 'blanchardstown', district: null },
  { name: 'Blanchardstown Dublin 15', slug: 'blanchardstown-dublin-15', district: 15 },
  { name: 'Booterstown', slug: 'booterstown', district: null },
  { name: 'Booterstown Ave', slug: 'booterstown-ave', district: null },
  { name: 'Brownsbarn', slug: 'brownsbarn', district: null },
  { name: 'Cabinteely', slug: 'cabinteely', district: null },
  { name: 'Cabinteely Dublin 18', slug: 'cabinteely-dublin-18', district: 18 },
  { name: 'Cabra Dublin 7', slug: 'cabra-dublin-7', district: 7 },
  { name: 'Carpenterstown Dublin 15', slug: 'carpenterstown-dublin-15', district: 15 },
  { name: 'Carrickmines', slug: 'carrickmines', district: null },
  { name: 'Carrickmines Dublin 18', slug: 'carrickmines-dublin-18', district: 18 },
  { name: 'Carrickmines Wood Dublin 18', slug: 'carrickmines-wood-dublin-18', district: 18 },
  { name: 'Castaheany Dublin 15', slug: 'castaheany-dublin-15', district: 15 },
  { name: 'Castleforbes Rd Dublin 1', slug: 'castleforbes-rd-dublin-1', district: 1 },
  { name: 'Castleknock', slug: 'castleknock', district: null },
  { name: 'Castleknock Dublin 15', slug: 'castleknock-dublin-15', district: 15 },
  { name: 'Chapelizod', slug: 'chapelizod', district: null },
  { name: 'Chapelizod Dublin 20', slug: 'chapelizod-dublin-20', district: 20 },
  { name: 'Cherry Orchard Dublin 10', slug: 'cherry-orchard-dublin-10', district: 10 },
  { name: 'Cherrywood Dublin 18', slug: 'cherrywood-dublin-18', district: 18 },
  { name: 'Christchurch Dublin 8', slug: 'christchurch-dublin-8', district: 8 },
  { name: 'Churchtown', slug: 'churchtown', district: null },
  { name: 'Churchtown Dublin 14', slug: 'churchtown-dublin-14', district: 14 },
  { name: 'Citywest', slug: 'citywest', district: null },
  { name: 'Citywest Dublin 24', slug: 'citywest-dublin-24', district: 24 },
  { name: 'Clondalkin', slug: 'clondalkin', district: null },
  { name: 'Clondalkin Dublin 22', slug: 'clondalkin-dublin-22', district: 22 },
  { name: 'Clondalkin Dublin 24', slug: 'clondalkin-dublin-24', district: 24 },
  { name: 'Clonee Dublin 15', slug: 'clonee-dublin-15', district: 15 },
  { name: 'Clongriffin', slug: 'clongriffin', district: null },
  { name: 'Clongriffin Dublin 13', slug: 'clongriffin-dublin-13', district: 13 },
  { name: 'Clonsilla', slug: 'clonsilla', district: null },
  { name: 'Clonsilla Dublin 15', slug: 'clonsilla-dublin-15', district: 15 },
  { name: 'Clonskeagh', slug: 'clonskeagh', district: null },
  { name: 'Clonskeagh Dublin 14', slug: 'clonskeagh-dublin-14', district: 14 },
  { name: 'Clontarf', slug: 'clontarf', district: null },
  { name: 'Clontarf Dublin 3', slug: 'clontarf-dublin-3', district: 3 },
  { name: 'Clontarf Rd Dublin 3', slug: 'clontarf-rd-dublin-3', district: 3 },
  { name: 'Conyngham Rd Dublin 8', slug: 'conyngham-rd-dublin-8', district: 8 },
  { name: 'Coolmine Dublin 15', slug: 'coolmine-dublin-15', district: 15 },
  { name: 'Coolock Dublin 17', slug: 'coolock-dublin-17', district: 17 },
  { name: 'Coolock Dublin 5', slug: 'coolock-dublin-5', district: 5 },
  { name: 'Cork St Dublin 8', slug: 'cork-st-dublin-8', district: 8 },
  { name: 'Crumlin Dublin 12', slug: 'crumlin-dublin-12', district: 12 },
  { name: 'Custom House Harbour Dublin 1', slug: 'custom-house-harbour-dublin-1', district: 1 },
  { name: 'Custom House Sq Dublin 1', slug: 'custom-house-sq-dublin-1', district: 1 },
  { name: 'Dalkey', slug: 'dalkey', district: null },
  { name: 'Dartry Dublin 6', slug: 'dartry-dublin-6', district: 6 },
  { name: 'Distillery Rd Dublin 3', slug: 'distillery-rd-dublin-3', district: 3 },
  { name: 'Donabate', slug: 'donabate', district: null },
  { name: 'Donaghmede', slug: 'donaghmede', district: null },
  { name: 'Donaghmede Dublin 13', slug: 'donaghmede-dublin-13', district: 13 },
  { name: 'Donnybrook', slug: 'donnybrook', district: null },
  { name: 'Donnybrook Dublin 4', slug: 'donnybrook-dublin-4', district: 4 },
  { name: 'Drimnagh', slug: 'drimnagh', district: null },
  { name: 'Drimnagh Dublin 12', slug: 'drimnagh-dublin-12', district: 12 },
  { name: 'Druid Valley Dublin 18', slug: 'druid-valley-dublin-18', district: 18 },
  { name: 'Drumcondra', slug: 'drumcondra', district: null },
  { name: 'Drumcondra Dublin 3', slug: 'drumcondra-dublin-3', district: 3 },
  { name: 'Drumcondra Dublin 9', slug: 'drumcondra-dublin-9', district: 9 },
  { name: 'Drynam Hall', slug: 'drynam-hall', district: null },
  { name: 'Dun Laoghaire', slug: 'dun-laoghaire', district: null },
  { name: 'Dun Laoire', slug: 'dun-laoire', district: null },
  { name: 'Dundrum', slug: 'dundrum', district: null },
  { name: 'Dundrum Dublin 14', slug: 'dundrum-dublin-14', district: 14 },
  { name: 'Dundrum Dublin 16', slug: 'dundrum-dublin-16', district: 16 },
  { name: 'Dunlaoghaire', slug: 'dunlaoghaire', district: null },
  { name: 'East Wall Dublin 3', slug: 'east-wall-dublin-3', district: 3 },
  { name: 'Fairview', slug: 'fairview', district: null },
  { name: 'Fairview Dublin 3', slug: 'fairview-dublin-3', district: 3 },
  { name: 'Finglas', slug: 'finglas', district: null },
  { name: 'Finglas Dublin 11', slug: 'finglas-dublin-11', district: 11 },
  { name: 'Finglas Rd Dublin 11', slug: 'finglas-rd-dublin-11', district: 11 },
  { name: 'Finglas West Dublin 11', slug: 'finglas-west-dublin-11', district: 11 },
  { name: 'Firhouse Dublin 24', slug: 'firhouse-dublin-24', district: 24 },
  { name: 'Fitzwilliam Quay Dublin 4', slug: 'fitzwilliam-quay-dublin-4', district: 4 },
  { name: 'Foley St Dublin 1', slug: 'foley-st-dublin-1', district: 1 },
  { name: 'Foxrock', slug: 'foxrock', district: null },
  { name: 'Foxrock Dublin 18', slug: 'foxrock-dublin-18', district: 18 },
  { name: 'Glasnevin', slug: 'glasnevin', district: null },
  { name: 'Glasnevin Dublin 11', slug: 'glasnevin-dublin-11', district: 11 },
  { name: 'Glasnevin Dublin 9', slug: 'glasnevin-dublin-9', district: 9 },
  { name: 'Glenageary', slug: 'glenageary', district: null },
  { name: 'Glenamuck Rd Dublin 18', slug: 'glenamuck-rd-dublin-18', district: 18 },
  { name: 'Glenamuck Road', slug: 'glenamuck-road', district: null },
  { name: 'Goatstown Dublin 14', slug: 'goatstown-dublin-14', district: 14 },
  { name: 'Grace Park Rd Dublin 9', slug: 'grace-park-rd-dublin-9', district: 9 },
  { name: 'Grange Rd Dublin 16', slug: 'grange-rd-dublin-16', district: 16 },
  { name: 'Griffith Ave Dublin 9', slug: 'griffith-ave-dublin-9', district: 9 },
  { name: 'Hanover Quay', slug: 'hanover-quay', district: null },
  { name: 'Hanover Quay Dublin 2', slug: 'hanover-quay-dublin-2', district: 2 },
  { name: 'Hansfield', slug: 'hansfield', district: null },
  { name: 'Harolds Cross', slug: 'harolds-cross', district: null },
  { name: 'Harolds Cross Dublin 6w', slug: 'harolds-cross-dublin-6w', district: 6 },
  { name: 'Howth', slug: 'howth', district: null },
  { name: 'Howth Dublin 13', slug: 'howth-dublin-13', district: 13 },
  { name: 'Howth Rd Dublin 3', slug: 'howth-rd-dublin-3', district: 3 },
  { name: 'I F S C Dublin 1', slug: 'i-f-s-c-dublin-1', district: 1 },
  { name: 'Ifsc Dublin 1', slug: 'ifsc-dublin-1', district: 1 },
  { name: 'Inchicore', slug: 'inchicore', district: null },
  { name: 'Inchicore Dublin 10', slug: 'inchicore-dublin-10', district: 10 },
  { name: 'Inchicore Dublin 8', slug: 'inchicore-dublin-8', district: 8 },
  { name: 'Inchicore Rd Dublin 8', slug: 'inchicore-rd-dublin-8', district: 8 },
  { name: 'Irishtown Dublin 4', slug: 'irishtown-dublin-4', district: 4 },
  { name: 'Islandbridge Dublin 8', slug: 'islandbridge-dublin-8', district: 8 },
  { name: 'Killester Dublin 5', slug: 'killester-dublin-5', district: 5 },
  { name: 'Killiney', slug: 'killiney', district: null },
  { name: 'Kilmainham Dublin 8', slug: 'kilmainham-dublin-8', district: 8 },
  { name: 'Kilmore Rd Dublin 5', slug: 'kilmore-rd-dublin-5', district: 5 },
  { name: 'Kilternan Dublin 18', slug: 'kilternan-dublin-18', district: 18 },
  { name: 'Kimmage Dublin 12', slug: 'kimmage-dublin-12', district: 12 },
  { name: 'Kinsealy', slug: 'kinsealy', district: null },
  { name: 'Knocklyon Dublin 16', slug: 'knocklyon-dublin-16', district: 16 },
  { name: 'Leopardstown', slug: 'leopardstown', district: null },
  { name: 'Leopardstown Dublin 18', slug: 'leopardstown-dublin-18', district: 18 },
  { name: 'Loughlinstown Dublin 18', slug: 'loughlinstown-dublin-18', district: 18 },
  { name: 'Lower Mayor St Dublin 1', slug: 'lower-mayor-st-dublin-1', district: 1 },
  { name: 'Lucan', slug: 'lucan', district: null },
  { name: 'Lusk', slug: 'lusk', district: null },
  { name: 'Malahide', slug: 'malahide', district: null },
  { name: 'Malahide Rd Dublin 13', slug: 'malahide-rd-dublin-13', district: 13 },
  { name: 'Malahide Rd Dublin 17', slug: 'malahide-rd-dublin-17', district: 17 },
  { name: 'Mayor St Lower Dublin 1', slug: 'mayor-st-lower-dublin-1', district: 1 },
  { name: 'Meakstown Dublin 11', slug: 'meakstown-dublin-11', district: 11 },
  { name: 'Merrion Rd Dublin 4', slug: 'merrion-rd-dublin-4', district: 4 },
  { name: 'Milltown', slug: 'milltown', district: null },
  { name: 'Milltown Dublin 14', slug: 'milltown-dublin-14', district: 14 },
  { name: 'Milltown Dublin 6', slug: 'milltown-dublin-6', district: 6 },
  { name: 'Milltown Rd Dublin 6', slug: 'milltown-rd-dublin-6', district: 6 },
  { name: 'Monkstown', slug: 'monkstown', district: null },
  { name: 'Mount Brown Dublin 8', slug: 'mount-brown-dublin-8', district: 8 },
  { name: 'Mount Merrion', slug: 'mount-merrion', district: null },
  { name: 'Mount St Annes Dublin 6', slug: 'mount-st-annes-dublin-6', district: 6 },
  { name: 'Mulhuddart Dublin 15', slug: 'mulhuddart-dublin-15', district: 15 },
  { name: 'Nangor Rd Dublin 12', slug: 'nangor-rd-dublin-12', district: 12 },
  { name: 'Naul', slug: 'naul', district: null },
  { name: 'Navan Rd Dublin 15', slug: 'navan-rd-dublin-15', district: 15 },
  { name: 'Navan Rd Dublin 7', slug: 'navan-rd-dublin-7', district: 7 },
  { name: 'Newcastle', slug: 'newcastle', district: null },
  { name: 'North Strand Dublin 3', slug: 'north-strand-dublin-3', district: 3 },
  { name: 'Northern Cross Dublin 17', slug: 'northern-cross-dublin-17', district: 17 },
  { name: 'Northwood Dublin 9', slug: 'northwood-dublin-9', district: 9 },
  { name: 'Ongar Dublin 15', slug: 'ongar-dublin-15', district: 15 },
  { name: 'Ongar Village Dublin 15', slug: 'ongar-village-dublin-15', district: 15 },
  { name: 'Oscar Traynor Rd Dublin 17', slug: 'oscar-traynor-rd-dublin-17', district: 17 },
  { name: 'Oscar Traynor Rd Dublin 9', slug: 'oscar-traynor-rd-dublin-9', district: 9 },
  { name: 'Ossory Rd Dublin 3', slug: 'ossory-rd-dublin-3', district: 3 },
  { name: 'Palmerstown Dublin 20', slug: 'palmerstown-dublin-20', district: 20 },
  { name: 'Park East', slug: 'park-east', district: null },
  { name: 'Park South Dublin 13', slug: 'park-south-dublin-13', district: 13 },
  { name: 'Park West Dublin 12', slug: 'park-west-dublin-12', district: 12 },
  { name: 'Patrick St Dublin 8', slug: 'patrick-st-dublin-8', district: 8 },
  { name: 'Pearse St Dublin 2', slug: 'pearse-st-dublin-2', district: 2 },
  { name: 'Perrystown Dublin 12', slug: 'perrystown-dublin-12', district: 12 },
  { name: 'Phibsborough Dublin 7', slug: 'phibsborough-dublin-7', district: 7 },
  { name: 'Phoenix Park Racecourse Dublin 15', slug: 'phoenix-park-racecourse-dublin-15', district: 15 },
  { name: 'Porterstown Dublin 15', slug: 'porterstown-dublin-15', district: 15 },
  { name: 'Portmarnock', slug: 'portmarnock', district: null },
  { name: 'Portobello Dublin 8', slug: 'portobello-dublin-8', district: 8 },
  { name: 'Purser Gardens Dublin 6', slug: 'purser-gardens-dublin-6', district: 6 },
  { name: 'Raheny Dublin 5', slug: 'raheny-dublin-5', district: 5 },
  { name: 'Ranelagh Dublin 6', slug: 'ranelagh-dublin-6', district: 6 },
  { name: 'Rathborne Dublin 15', slug: 'rathborne-dublin-15', district: 15 },
  { name: 'Rathcoole', slug: 'rathcoole', district: null },
  { name: 'Rathfarnham', slug: 'rathfarnham', district: null },
  { name: 'Rathfarnham Dublin 14', slug: 'rathfarnham-dublin-14', district: 14 },
  { name: 'Rathfarnham Dublin 16', slug: 'rathfarnham-dublin-16', district: 16 },
  { name: 'Rathgar', slug: 'rathgar', district: null },
  { name: 'Rathgar Dublin 6', slug: 'rathgar-dublin-6', district: 6 },
  { name: 'Rathmichael', slug: 'rathmichael', district: null },
  { name: 'Rathmines', slug: 'rathmines', district: null },
  { name: 'Rathmines Dublin 6', slug: 'rathmines-dublin-6', district: 6 },
  { name: 'Ratoath Rd Dublin 15', slug: 'ratoath-rd-dublin-15', district: 15 },
  { name: 'Rialto Dublin 8', slug: 'rialto-dublin-8', district: 8 },
  { name: 'Richmond Rd Dublin 3', slug: 'richmond-rd-dublin-3', district: 3 },
  { name: 'Ridgewood', slug: 'ridgewood', district: null },
  { name: 'Ridgewood Swords', slug: 'ridgewood-swords', district: null },
  { name: 'Ringsend', slug: 'ringsend', district: null },
  { name: 'Ringsend Dublin 4', slug: 'ringsend-dublin-4', district: 4 },
  { name: 'Ringsend Rd Dublin 4', slug: 'ringsend-rd-dublin-4', district: 4 },
  { name: 'Riverside Dublin 2', slug: 'riverside-dublin-2', district: 2 },
  { name: 'Robswall', slug: 'robswall', district: null },
  { name: 'Rochestown Ave', slug: 'rochestown-ave', district: null },
  { name: 'Royal Canal Park Dublin 15', slug: 'royal-canal-park-dublin-15', district: 15 },
  { name: 'Rush', slug: 'rush', district: null },
  { name: 'Saggart', slug: 'saggart', district: null },
  { name: 'Saggart Dublin 24', slug: 'saggart-dublin-24', district: 24 },
  { name: 'Sandycove', slug: 'sandycove', district: null },
  { name: 'Sandyford', slug: 'sandyford', district: null },
  { name: 'Sandyford Dublin 16', slug: 'sandyford-dublin-16', district: 16 },
  { name: 'Sandyford Dublin 18', slug: 'sandyford-dublin-18', district: 18 },
  { name: 'Sandymount', slug: 'sandymount', district: null },
  { name: 'Sandymount Dublin 4', slug: 'sandymount-dublin-4', district: 4 },
  { name: 'Santry', slug: 'santry', district: null },
  { name: 'Santry Dublin 9', slug: 'santry-dublin-9', district: 9 },
  { name: 'Scholarstown Rd Dublin 16', slug: 'scholarstown-rd-dublin-16', district: 16 },
  { name: 'Serpentine Ave Dublin 4', slug: 'serpentine-ave-dublin-4', district: 4 },
  { name: 'Shankill', slug: 'shankill', district: null },
  { name: 'Shankill Dublin 18', slug: 'shankill-dublin-18', district: 18 },
  { name: 'Sion Hill', slug: 'sion-hill', district: null },
  { name: 'Sir John Rogersons Quay Dublin 2', slug: 'sir-john-rogersons-quay-dublin-2', district: 2 },
  { name: 'Skerries', slug: 'skerries', district: null },
  { name: 'Smithfield', slug: 'smithfield', district: null },
  { name: 'Smithfield Dublin 7', slug: 'smithfield-dublin-7', district: 7 },
  { name: 'Smithfield Market Dublin 7', slug: 'smithfield-market-dublin-7', district: 7 },
  { name: 'Snugborough Rd Dublin 15', slug: 'snugborough-rd-dublin-15', district: 15 },
  { name: 'South Circular Rd Dublin 8', slug: 'south-circular-rd-dublin-8', district: 8 },
  { name: 'South Lotts Rd Dublin 4', slug: 'south-lotts-rd-dublin-4', district: 4 },
  { name: 'St Margarets Rd Dublin 11', slug: 'st-margarets-rd-dublin-11', district: 11 },
  { name: 'Stepaside', slug: 'stepaside', district: null },
  { name: 'Stepaside Dublin 18', slug: 'stepaside-dublin-18', district: 18 },
  { name: 'Stillorgan', slug: 'stillorgan', district: null },
  { name: 'Stoneybatter Dublin 7', slug: 'stoneybatter-dublin-7', district: 7 },
  { name: 'Sussex Rd Dublin 4', slug: 'sussex-rd-dublin-4', district: 4 },
  { name: 'Sutton', slug: 'sutton', district: null },
  { name: 'Sutton Dublin 13', slug: 'sutton-dublin-13', district: 13 },
  { name: 'Swords', slug: 'swords', district: null },
  { name: 'Swords Road', slug: 'swords-road', district: null },
  { name: 'Tallaght', slug: 'tallaght', district: null },
  { name: 'Tallaght Dublin 24', slug: 'tallaght-dublin-24', district: 24 },
  { name: 'Temple Bar Dublin 2', slug: 'temple-bar-dublin-2', district: 2 },
  { name: 'Temple Bar Dublin 8', slug: 'temple-bar-dublin-8', district: 8 },
  { name: 'Templeogue', slug: 'templeogue', district: null },
  { name: 'Templeogue Dublin 16', slug: 'templeogue-dublin-16', district: 16 },
  { name: 'Templeogue Dublin 6w', slug: 'templeogue-dublin-6w', district: 6 },
  { name: 'Terenure', slug: 'terenure', district: null },
  { name: 'Terenure Dublin 12', slug: 'terenure-dublin-12', district: 12 },
  { name: 'Terenure Dublin 6', slug: 'terenure-dublin-6', district: 6 },
  { name: 'Terenure Dublin 6w', slug: 'terenure-dublin-6w', district: 6 },
  { name: 'The Coast Dublin 13', slug: 'the-coast-dublin-13', district: 13 },
  { name: 'The Gallops Dublin 18', slug: 'the-gallops-dublin-18', district: 18 },
  { name: 'Tyrellstown Dublin 15', slug: 'tyrellstown-dublin-15', district: 15 },
  { name: 'Tyrrelstown', slug: 'tyrrelstown', district: null },
  { name: 'Tyrrelstown Dublin 15', slug: 'tyrrelstown-dublin-15', district: 15 },
  { name: 'Walkinstown Dublin 12', slug: 'walkinstown-dublin-12', district: 12 },
  { name: 'Wall Quay North Dublin 1', slug: 'wall-quay-north-dublin-1', district: 1 },
  { name: 'Waterville Dublin 15', slug: 'waterville-dublin-15', district: 15 },
  { name: 'Whitehall Dublin 9', slug: 'whitehall-dublin-9', district: 9 },
  { name: 'Whitestown Way Dublin 24', slug: 'whitestown-way-dublin-24', district: 24 },
  { name: 'Windy Arbour Dublin 14', slug: 'windy-arbour-dublin-14', district: 14 },
  { name: 'Wood Dublin 9', slug: 'wood-dublin-9', district: 9 },
  { name: 'Yeats Way Dublin 12', slug: 'yeats-way-dublin-12', district: 12 },
];

/**
 * Convert area name to URL slug
 * "Dublin 4" -> "dublin-4"
 * "Ballsbridge" -> "ballsbridge"
 */
export function areaToSlug(areaName: string): string {
  const area = DUBLIN_AREAS.find(a => 
    a.name.toLowerCase() === areaName.toLowerCase()
  );
  
  if (area) {
    return area.slug;
  }
  
  // Fallback: simple slugify
  return areaName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Convert URL slug to area name
 * "dublin-4" -> "Dublin 4"
 * "ballsbridge" -> "Ballsbridge"
 */
export function slugToArea(slug: string): string | null {
  const area = DUBLIN_AREAS.find(a => a.slug === slug);
  return area ? area.name : null;
}

/**
 * Get all area slugs (for static generation)
 */
export function getAllAreaSlugs(): string[] {
  return DUBLIN_AREAS.map(a => a.slug);
}

/**
 * Get area info by slug
 */
export function getAreaInfo(slug: string) {
  return DUBLIN_AREAS.find(a => a.slug === slug);
}

/**
 * Check if an address matches an area
 * Handles various address formats:
 * - "123 Main St, Dublin 4"
 * - "45 Park Ave, Ballsbridge, Dublin 4"
 * - "10 High St, Ranelagh"
 * - "Apt 5, Sandyford, Dublin 18"
 */
export function addressMatchesArea(address: string, areaName: string): boolean {
  const normalizedAddress = address.toLowerCase();
  const normalizedArea = areaName.toLowerCase();
  
  // Check for district number (Dublin 4, D4, etc.)
  if (/dublin\s*\d+/.test(normalizedArea)) {
    const districtMatch = normalizedArea.match(/dublin\s*(\d+w?)/);
    if (districtMatch) {
      const district = districtMatch[1];
      // Match "Dublin 4", "D4", "Dublin4"
      const pattern = new RegExp(`(dublin\\s*${district}|d${district}(?!\\d)|dublin${district})\\b`, 'i');
      return pattern.test(normalizedAddress);
    }
  }
  
  // Check for named area - must be word boundary to avoid partial matches
  // e.g., "Sandyford" shouldn't match "Sandycove"
  const escapedArea = normalizedArea.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordBoundaryPattern = new RegExp(`\\b${escapedArea}\\b`, 'i');
  return wordBoundaryPattern.test(normalizedAddress);
}

/**
 * Extract primary area from address
 * Used by the existing extractArea function in data.ts
 */
export function extractPrimaryArea(address: string): string {
  const parts = address.split(',').map(p => p.trim());
  
  // Look for Dublin district first
  for (const part of parts) {
    if (/Dublin\s*\d+/i.test(part)) {
      return part.replace(/,?\s*Dublin$/i, '').trim();
    }
  }
  
  // Look for known named area
  const normalizedAddress = address.toLowerCase();
  for (const area of DUBLIN_AREAS) {
    if (normalizedAddress.includes(area.name.toLowerCase())) {
      return area.name;
    }
  }
  
  // Fallback to second-to-last part (but filter out generic terms)
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2].replace(/Dublin\s*\d*/i, '').trim();
    // Skip generic terms that aren't actual area names
    const genericTerms = ['co', 'co.', 'county', 'dublin', ''];
    if (candidate && !genericTerms.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  
  // If we still haven't found an area, try the third-to-last part
  if (parts.length >= 3) {
    const candidate = parts[parts.length - 3].replace(/Dublin\s*\d*/i, '').trim();
    const genericTerms = ['co', 'co.', 'county', 'dublin', ''];
    if (candidate && !genericTerms.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  
  return 'Dublin';
}

