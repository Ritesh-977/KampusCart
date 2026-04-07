const BASE_URL = 'https://www.kampuscart.site';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

export const SEO = {

  home(college) {
    if (!college) {
      return {
        title: 'KampusCart – Campus Marketplace for Students',
        description:
          'The exclusive marketplace for college students. Buy and sell books, electronics, and dorm essentials securely within your campus.',
        url: BASE_URL,
      };
    }
    return {
      title: `${college.name} Student Marketplace | Buy & Sell | KampusCart`,
      description:
        `Buy and sell second-hand items, find lost belongings, access study materials, ` +
        `and discover events — all exclusive to ${college.name} students. Join free on KampusCart.`,
      url: BASE_URL,
    };
  },

  item(item, college) {
    const collegeName = college?.shortName || item?.college || '';
    const priceStr = item?.price != null ? ` ₹${item.price}.` : '';
    const descSnippet = item?.description
      ? item.description.substring(0, 110).trimEnd()
      : 'Connect with the seller securely on KampusCart.';
    const image = item?.images?.[0] || DEFAULT_IMAGE;

    return {
      title: `${item.title}${collegeName ? ` — ${collegeName}` : ''} | KampusCart`,
      description: `${item.title} for sale${collegeName ? ` at ${collegeName}` : ''}.${priceStr} ${descSnippet}`,
      url: `${BASE_URL}/item/${item._id}`,
      imageUrl: image,
      type: 'product',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.title,
        description: item.description || '',
        image: item.images || [image],
        brand: { '@type': 'Brand', name: 'KampusCart' },
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: 'INR',
          availability: item.isSold
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/InStock',
          url: `${BASE_URL}/item/${item._id}`,
          seller: {
            '@type': 'Person',
            name: item.seller?.name || 'KampusCart Student',
          },
        },
      },
    };
  },

  lostFound(college) {
    const fullName = college?.name || 'Your Campus';
    const shortName = college?.shortName || 'campus';
    return {
      title: `Lost & Found at ${fullName} | KampusCart`,
      description:
        `Lost something on ${shortName} campus? Post a report or help a fellow student ` +
        `recover their belongings. Free, fast, campus-exclusive on KampusCart.`,
      url: `${BASE_URL}/lost-and-found`,
    };
  },

  about() {
    return {
      title: "About KampusCart — India's Campus Marketplace for Students",
      description:
        "KampusCart is India's most trusted campus-exclusive marketplace for IIT, NIT, and BITS " +
        'students. Buy, sell, find lost items, and connect safely — all within your campus.',
      url: `${BASE_URL}/about`,
    };
  },

  contact() {
    return {
      title: 'Contact KampusCart | Student Support',
      description:
        "Reach out to the KampusCart team for support, feedback, or partnership inquiries. " +
        "We're here to help every campus student.",
      url: `${BASE_URL}/contact`,
    };
  },

  collegeSelection() {
    return {
      title: 'Select Your College | KampusCart',
      description:
        'Choose your college to access your campus-exclusive marketplace. ' +
        'KampusCart supports 60+ IITs, NITs, and top engineering colleges across India.',
      url: `${BASE_URL}/select-college`,
    };
  },

  privacy() {
    return {
      title: 'Privacy Policy | KampusCart',
      description:
        'Read the KampusCart privacy policy to understand how we collect, use, and protect ' +
        'your data on our campus marketplace platform.',
      url: `${BASE_URL}/privacy`,
    };
  },

  terms() {
    return {
      title: 'Terms & Conditions | KampusCart',
      description:
        'Review the KampusCart terms and conditions governing the use of our campus marketplace. ' +
        'Safe, fair, and student-first policies.',
      url: `${BASE_URL}/terms`,
    };
  },

  events(college) {
    const fullName = college?.name || 'Your Campus';
    const shortName = college?.shortName || 'campus';
    return {
      title: `Campus Events at ${fullName} | KampusCart`,
      description:
        `Discover and create upcoming events at ${shortName}. ` +
        `From cultural fests to technical talks — stay in the loop on KampusCart.`,
      url: `${BASE_URL}/events`,
    };
  },

  sports(college) {
    const fullName = college?.name || 'Your Campus';
    const shortName = college?.shortName || 'campus';
    return {
      title: `Sports Registration at ${fullName} | KampusCart`,
      description:
        `Register for cricket, football, badminton, and more tournaments at ${shortName}. ` +
        `Find sports events and compete with fellow students on KampusCart.`,
      url: `${BASE_URL}/sports`,
    };
  },

  studyMaterials(college) {
    const fullName = college?.name || 'Your Campus';
    const shortName = college?.shortName || 'campus';
    return {
      title: `Study Materials at ${fullName} | KampusCart`,
      description:
        `Access notes, exam papers, and books shared by ${shortName} students. ` +
        `Upload and download free study resources on KampusCart.`,
      url: `${BASE_URL}/study-materials`,
    };
  },
};
