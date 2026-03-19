
export const colleges = [

  // ── IITs ────────────────────────────────────────────────────────────────────
  { id: "iit-bombay",    name: "IIT Bombay",            shortName: "IIT-B",    location: "Mumbai, Maharashtra",        emailDomain: "iitb.ac.in",      theme: { primary: "#0e9f6e", secondary: "#e8f8f5", accent: "#0e9f6e" }, emoji: "🎓" },
  { id: "iit-delhi",     name: "IIT Delhi",             shortName: "IIT-D",    location: "New Delhi",                  emailDomain: "iitd.ac.in",      theme: { primary: "#1a56db", secondary: "#e8f0fe", accent: "#1a56db" }, emoji: "🏛️" },
  { id: "iit-guwahati",  name: "IIT Guwahati",          shortName: "IIT-G",    location: "Guwahati, Assam",            emailDomain: "iitg.ac.in",      theme: { primary: "#c2410c", secondary: "#ffedd5", accent: "#c2410c" }, emoji: "🌄" },
  { id: "iit-kanpur",    name: "IIT Kanpur",            shortName: "IIT-K",    location: "Kanpur, Uttar Pradesh",      emailDomain: "iitk.ac.in",      theme: { primary: "#e3a008", secondary: "#fef3c7", accent: "#e3a008" }, emoji: "⚙️" },
  { id: "iit-kharagpur", name: "IIT Kharagpur",         shortName: "IIT-KGP",  location: "Kharagpur, West Bengal",     emailDomain: "iitkgp.ac.in",    theme: { primary: "#e02424", secondary: "#fde8e8", accent: "#e02424" }, emoji: "🏫" },
  { id: "iit-madras",    name: "IIT Madras",            shortName: "IIT-M",    location: "Chennai, Tamil Nadu",        emailDomain: "iitm.ac.in",      theme: { primary: "#7e3af2", secondary: "#f3e8ff", accent: "#7e3af2" }, emoji: "🔬" },
  { id: "iit-roorkee",   name: "IIT Roorkee",           shortName: "IIT-R",    location: "Roorkee, Uttarakhand",       emailDomain: "iitr.ac.in",      theme: { primary: "#057a55", secondary: "#def7ec", accent: "#057a55" }, emoji: "🌿" },
  { id: "iit-hyderabad", name: "IIT Hyderabad",         shortName: "IIT-H",    location: "Hyderabad, Telangana",       emailDomain: "iith.ac.in",      theme: { primary: "#1c64f2", secondary: "#e8effe", accent: "#1c64f2" }, emoji: "💻" },
  { id: "iit-bhubaneswar",name:"IIT Bhubaneswar",       shortName: "IIT-BBS",  location: "Bhubaneswar, Odisha",        emailDomain: "iitbbs.ac.in",    theme: { primary: "#0694a2", secondary: "#e3fafc", accent: "#0694a2" }, emoji: "🌊" },
  { id: "iit-gandhinagar",name:"IIT Gandhinagar",       shortName: "IIT-GN",   location: "Gandhinagar, Gujarat",       emailDomain: "iitgn.ac.in",     theme: { primary: "#5850ec", secondary: "#edebfe", accent: "#5850ec" }, emoji: "🏙️" },
  { id: "iit-jodhpur",   name: "IIT Jodhpur",           shortName: "IIT-J",    location: "Jodhpur, Rajasthan",         emailDomain: "iitj.ac.in",      theme: { primary: "#b45309", secondary: "#fef3c7", accent: "#b45309" }, emoji: "🏜️" },
  { id: "iit-patna",     name: "IIT Patna",             shortName: "IIT-P",    location: "Patna, Bihar",               emailDomain: "iitp.ac.in",      theme: { primary: "#d61f69", secondary: "#fce8f3", accent: "#d61f69" }, emoji: "🏛️" },
  { id: "iit-indore",    name: "IIT Indore",            shortName: "IIT-I",    location: "Indore, Madhya Pradesh",     emailDomain: "iiti.ac.in",      theme: { primary: "#7e3af2", secondary: "#f3e8ff", accent: "#7e3af2" }, emoji: "🌸" },
  { id: "iit-mandi",     name: "IIT Mandi",             shortName: "IIT-Mandi",location: "Mandi, Himachal Pradesh",    emailDomain: "iitmandi.ac.in",  theme: { primary: "#057a55", secondary: "#def7ec", accent: "#057a55" }, emoji: "🏔️" },
  { id: "iit-bhu",       name: "IIT (BHU) Varanasi",    shortName: "IIT-BHU",  location: "Varanasi, Uttar Pradesh",    emailDomain: "iitbhu.ac.in",    theme: { primary: "#e3a008", secondary: "#fef3c7", accent: "#e3a008" }, emoji: "🕌" },
  { id: "iit-palakkad",  name: "IIT Palakkad",          shortName: "IIT-PKD",  location: "Palakkad, Kerala",           emailDomain: "iitpkd.ac.in",    theme: { primary: "#0e9f6e", secondary: "#e8f8f5", accent: "#0e9f6e" }, emoji: "🌴" },
  { id: "iit-tirupati",  name: "IIT Tirupati",          shortName: "IIT-TP",   location: "Tirupati, Andhra Pradesh",   emailDomain: "iittp.ac.in",     theme: { primary: "#c2410c", secondary: "#ffedd5", accent: "#c2410c" }, emoji: "⛪" },
  { id: "iit-ism",       name: "IIT (ISM) Dhanbad",     shortName: "IIT-ISM",  location: "Dhanbad, Jharkhand",         emailDomain: "iitism.ac.in",    theme: { primary: "#1a56db", secondary: "#e8f0fe", accent: "#1a56db" }, emoji: "⛏️" },
  { id: "iit-bhilai",    name: "IIT Bhilai",            shortName: "IIT-Bhilai",location:"Bhilai, Chhattisgarh",       emailDomain: "iitbhilai.ac.in", theme: { primary: "#e02424", secondary: "#fde8e8", accent: "#e02424" }, emoji: "🏗️" },
  { id: "iit-dharwad",   name: "IIT Dharwad",           shortName: "IIT-DH",   location: "Dharwad, Karnataka",         emailDomain: "iitdh.ac.in",     theme: { primary: "#1c64f2", secondary: "#e8effe", accent: "#1c64f2" }, emoji: "🌻" },
  { id: "iit-jammu",     name: "IIT Jammu",             shortName: "IIT-JMU",  location: "Jammu, J&K",                 emailDomain: "iitjammu.ac.in",  theme: { primary: "#5850ec", secondary: "#edebfe", accent: "#5850ec" }, emoji: "❄️" },
  { id: "iit-goa",       name: "IIT Goa",               shortName: "IIT-Goa",  location: "Goa",                        emailDomain: "iitgoa.ac.in",    theme: { primary: "#0694a2", secondary: "#e3fafc", accent: "#0694a2" }, emoji: "🏖️" },
  { id: "iit-ropar",     name: "IIT Ropar",             shortName: "IIT-RPR",  location: "Ropar, Punjab",              emailDomain: "iitrpr.ac.in",    theme: { primary: "#b45309", secondary: "#fef3c7", accent: "#b45309" }, emoji: "🌾" },

  // ── NITs ────────────────────────────────────────────────────────────────────
  { id: "mnnit-allahabad",name:"MNNIT Allahabad",       shortName: "MNNIT",    location: "Allahabad, Uttar Pradesh",   emailDomain: "mnnit.ac.in",     theme: { primary: "#1e40af", secondary: "#dbeafe", accent: "#1e40af" }, emoji: "🏛️" },
  { id: "nit-agartala",  name: "NIT Agartala",          shortName: "NIT-A",    location: "Agartala, Tripura",          emailDomain: "nita.ac.in",      theme: { primary: "#5850ec", secondary: "#edebfe", accent: "#5850ec" }, emoji: "🌿" },
  { id: "nit-andhra",    name: "NIT Andhra Pradesh",    shortName: "NIT-AP",   location: "Tadepalligudem, Andhra Pradesh", emailDomain: "nitandhra.ac.in", theme: { primary: "#0e9f6e", secondary: "#e8f8f5", accent: "#0e9f6e" }, emoji: "🌾" },
  { id: "nit-arunachal", name: "NIT Arunachal Pradesh", shortName: "NIT-AR",   location: "Yupia, Arunachal Pradesh",   emailDomain: "nitap.ac.in",        theme: { primary: "#c2410c", secondary: "#ffedd5", accent: "#c2410c" }, emoji: "🏔️" },
  { id: "nit-calicut",   name: "NIT Calicut",           shortName: "NIT-C",    location: "Calicut, Kerala",            emailDomain: "nitc.ac.in",      theme: { primary: "#0694a2", secondary: "#e3fafc", accent: "#0694a2" }, emoji: "🌴" },
  { id: "nit-delhi",     name: "NIT Delhi",             shortName: "NIT-D",    location: "New Delhi",                  emailDomain: "nitdelhi.ac.in",  theme: { primary: "#1a56db", secondary: "#e8f0fe", accent: "#1a56db" }, emoji: "🏛️" },
  { id: "nit-durgapur",  name: "NIT Durgapur",          shortName: "NIT-DGP",  location: "Durgapur, West Bengal",      emailDomain: "nitdgp.ac.in",    theme: { primary: "#7e3af2", secondary: "#f3e8ff", accent: "#7e3af2" }, emoji: "⚙️" },
  { id: "nit-goa",       name: "NIT Goa",               shortName: "NIT-Goa",  location: "Goa",                        emailDomain: "nitgoa.ac.in",    theme: { primary: "#057a55", secondary: "#def7ec", accent: "#057a55" }, emoji: "🏖️" },
  { id: "nit-hamirpur",  name: "NIT Hamirpur",          shortName: "NIT-HMR",  location: "Hamirpur, Himachal Pradesh", emailDomain: "nith.ac.in",      theme: { primary: "#e3a008", secondary: "#fef3c7", accent: "#e3a008" }, emoji: "🏔️" },
  { id: "nit-jalandhar", name: "NIT Jalandhar",         shortName: "NIT-J",    location: "Jalandhar, Punjab",          emailDomain: "nitj.ac.in",      theme: { primary: "#e02424", secondary: "#fde8e8", accent: "#e02424" }, emoji: "🌾" },
  { id: "nit-jamshedpur",name: "NIT Jamshedpur",        shortName: "NIT-JSR",  location: "Jamshedpur, Jharkhand",      emailDomain: "nitjsr.ac.in",    theme: { primary: "#1c64f2", secondary: "#e8effe", accent: "#1c64f2" }, emoji: "🏭" },
  { id: "nit-surathkal", name: "NIT Karnataka (Surathkal)", shortName: "NITK", location: "Surathkal, Karnataka",       emailDomain: "nitk.ac.in",      theme: { primary: "#0694a2", secondary: "#e3fafc", accent: "#0694a2" }, emoji: "🌊" },
  { id: "nit-kurukshetra",name:"NIT Kurukshetra",       shortName: "NIT-KKR",  location: "Kurukshetra, Haryana",       emailDomain: "nitkkr.ac.in",    theme: { primary: "#5850ec", secondary: "#edebfe", accent: "#5850ec" }, emoji: "🏹" },
  { id: "nit-manipur",   name: "NIT Manipur",           shortName: "NIT-MN",   location: "Imphal, Manipur",            emailDomain: "nitmanipur.ac.in",theme: { primary: "#d61f69", secondary: "#fce8f3", accent: "#d61f69" }, emoji: "🌺" },
  { id: "nit-meghalaya", name: "NIT Meghalaya",         shortName: "NIT-MEG",  location: "Shillong, Meghalaya",        emailDomain: "nitm.ac.in",      theme: { primary: "#0e9f6e", secondary: "#e8f8f5", accent: "#0e9f6e" }, emoji: "🌧️" },
  { id: "nit-mizoram",   name: "NIT Mizoram",           shortName: "NIT-MZ",   location: "Aizawl, Mizoram",            emailDomain: "nitmz.ac.in",     theme: { primary: "#057a55", secondary: "#def7ec", accent: "#057a55" }, emoji: "🌿" },
  { id: "nit-nagaland",  name: "NIT Nagaland",          shortName: "NIT-NG",   location: "Dimapur, Nagaland",          emailDomain: "nitnagaland.ac.in",theme:{ primary: "#c2410c", secondary: "#ffedd5", accent: "#c2410c" }, emoji: "🌄" },
  { id: "nit-patna",     name: "NIT Patna",             shortName: "NIT-P",    location: "Patna, Bihar",               emailDomain: "nitp.ac.in",      theme: { primary: "#e3a008", secondary: "#fef3c7", accent: "#e3a008" }, emoji: "🏛️" },
  { id: "nit-puducherry",name: "NIT Puducherry",        shortName: "NIT-PY",   location: "Karaikal, Puducherry",       emailDomain: "nitpy.ac.in",     theme: { primary: "#7e3af2", secondary: "#f3e8ff", accent: "#7e3af2" }, emoji: "🌊" },
  { id: "nit-raipur",    name: "NIT Raipur",            shortName: "NIT-RR",   location: "Raipur, Chhattisgarh",       emailDomain: "nitrr.ac.in",     theme: { primary: "#1a56db", secondary: "#e8f0fe", accent: "#1a56db" }, emoji: "🌳" },
  { id: "nit-rourkela",  name: "NIT Rourkela",          shortName: "NIT-RKL",  location: "Rourkela, Odisha",           emailDomain: "nitrkl.ac.in",    theme: { primary: "#e02424", secondary: "#fde8e8", accent: "#e02424" }, emoji: "⚙️" },
  { id: "nit-silchar",   name: "NIT Silchar",           shortName: "NIT-S",    location: "Silchar, Assam",             emailDomain: "nits.ac.in",      theme: { primary: "#1c64f2", secondary: "#e8effe", accent: "#1c64f2" }, emoji: "🌿" },
  { id: "nit-srinagar",  name: "NIT Srinagar",          shortName: "NIT-SGR",  location: "Srinagar, J&K",              emailDomain: "nitsri.ac.in",    theme: { primary: "#5850ec", secondary: "#edebfe", accent: "#5850ec" }, emoji: "❄️" },
  { id: "nit-trichy",    name: "NIT Tiruchirappalli",   shortName: "NIT-T",    location: "Tiruchirappalli, Tamil Nadu", emailDomain: "nitt.edu",       theme: { primary: "#d61f69", secondary: "#fce8f3", accent: "#d61f69" }, emoji: "📐" },
  { id: "nit-uttarakhand",name:"NIT Uttarakhand",       shortName: "NIT-UK",   location: "Srinagar, Uttarakhand",      emailDomain: "nituk.ac.in",     theme: { primary: "#057a55", secondary: "#def7ec", accent: "#057a55" }, emoji: "🏔️" },
  { id: "nit-warangal",  name: "NIT Warangal",          shortName: "NIT-W",    location: "Warangal, Telangana",        emailDomain: "nitw.ac.in",      theme: { primary: "#e3a008", secondary: "#fef3c7", accent: "#e3a008" }, emoji: "🏗️" },
  { id: "mnit-jaipur",   name: "MNIT Jaipur",           shortName: "MNIT",     location: "Jaipur, Rajasthan",          emailDomain: "mnit.ac.in",      theme: { primary: "#c2410c", secondary: "#ffedd5", accent: "#c2410c" }, emoji: "🏰" },
  { id: "manit-bhopal",  name: "MANIT Bhopal",          shortName: "MANIT",    location: "Bhopal, Madhya Pradesh",     emailDomain: "manit.ac.in",     theme: { primary: "#0694a2", secondary: "#e3fafc", accent: "#0694a2" }, emoji: "🌲" },
  { id: "svnit-surat",   name: "SVNIT Surat",           shortName: "SVNIT",    location: "Surat, Gujarat",             emailDomain: "svnit.ac.in",     theme: { primary: "#1a56db", secondary: "#e8f0fe", accent: "#1a56db" }, emoji: "🏭" },
  { id: "vnit-nagpur",   name: "VNIT Nagpur",           shortName: "VNIT",     location: "Nagpur, Maharashtra",        emailDomain: "vnit.ac.in",      theme: { primary: "#7e3af2", secondary: "#f3e8ff", accent: "#7e3af2" }, emoji: "🐯" },
  { id: "nit-sikkim",    name: "NIT Sikkim",            shortName: "NIT-SKM",  location: "Ravangla, Sikkim",           emailDomain: "nitsikkim.ac.in", theme: { primary: "#0e9f6e", secondary: "#e8f8f5", accent: "#0e9f6e" }, emoji: "🏔️" },

  // ── Other Institutions ──────────────────────────────────────────────────────
  // ── Other Institutions ──────────────────────────────────────────────────────
  { id: "bits-pilani",   name: "BITS Pilani",           shortName: "BITS-P",   location: "Pilani, Rajasthan",          emailDomain: "pilani.bits-pilani.ac.in", theme: { primary: "#b45309", secondary: "#fef3c7", accent: "#b45309" }, emoji: "🏜️" },
  { id: "bits-goa",      name: "BITS Goa",              shortName: "BITS-G",   location: "Vasco da Gama, Goa",         emailDomain: "goa.bits-pilani.ac.in",    theme: { primary: "#0e9f6e", secondary: "#def7ec", accent: "#0e9f6e" }, emoji: "🏖️" },
  { id: "bits-hyderabad",name: "BITS Hyderabad",        shortName: "BITS-H",   location: "Hyderabad, Telangana",       emailDomain: "hyderabad.bits-pilani.ac.in",theme: { primary: "#6875f5", secondary: "#eef2ff", accent: "#6875f5" }, emoji: "🎯" },
  
  { id: "vit-vellore",   name: "VIT Vellore",           shortName: "VIT",      location: "Vellore, Tamil Nadu",        emailDomain: "vitstudent.ac.in",theme: { primary: "#e02424", secondary: "#fde8e8", accent: "#e02424" }, emoji: "🚀" },
  { id: "srm",           name: "SRM Institute of Science and Technology", shortName: "SRM", location: "Chennai, Tamil Nadu", emailDomain: "srmist.edu.in",  theme: { primary: "#e3a008", secondary: "#fef3c7", accent: "#e3a008" }, emoji: "🌟" },
  { id: "manipal",       name: "Manipal Institute of Technology", shortName: "MIT Manipal", location: "Manipal, Karnataka", emailDomain: "learner.manipal.edu", theme: { primary: "#0694a2", secondary: "#e3fafc", accent: "#0694a2" }, emoji: "🧪" },
  { id: "thapar",        name: "Thapar Institute of Engineering", shortName: "Thapar", location: "Patiala, Punjab",    emailDomain: "thapar.edu",      theme: { primary: "#057a55", secondary: "#def7ec", accent: "#057a55" }, emoji: "⚡" },

  // { id: "other",         name: "Other College",         shortName: "Other",    location: "India",                      emailDomain: null,              theme: { primary: "#6b7280", secondary: "#f3f4f6", accent: "#6b7280" }, emoji: "🎒" },
];

// Helper to find a college by its `name` string (used when syncing with user.college)
export const findCollegeByName = (name) =>
  colleges.find(
    (c) => c.name.toLowerCase() === (name || "").toLowerCase()
  ) || null;

// Helper to find a college by its `id`
export const findCollegeById = (id) =>
  colleges.find((c) => c.id === id) || null;

// Helper to find a college by its email domain
export const findCollegeByDomain = (domain) =>
  colleges.find((c) => c.emailDomain === (domain || "").toLowerCase()) || null;
