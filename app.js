(() => {
  'use strict';


  /* =========================================================
     CONSTANTS
     ========================================================= */

     const AI_IMPORT_ENDPOINT =
  'https://konoozagent.khaledsan201031.workers.dev/import-offer';
  
  const CLIENT_INTAKES_ENDPOINT =
  'https://konoozagent.khaledsan201031.workers.dev/intakes';
  let currentClientIntakes = [];
  let pendingLunaResults =
  null;
  const selectedLunaResults = {
  flights:
    new Set(),

  hotels:
    new Set()
};
  let clientIntakesSearchTimer =
  null;

  const categories = {
    flight: {
      label: 'الطيران',
      icon: '✈'
    },

    hotel: {
      label: 'الفنادق',
      icon: '⌂'
    },

    transfer: {
      label: 'التنقلات',
      icon: '↔'
    },

    activity: {
      label: 'الأنشطة',
      icon: '✦'
    }
  };


  const LEGACY_STORAGE_KEY =
    'konooz-tourism-quote-malaysia-request-v4';


  const OFFERS_STORAGE_KEY =
    'konooz-tourism-saved-offers-v1';


  const ACTIVE_OFFER_KEY =
    'konooz-tourism-active-offer-v1';


  const USER_NAME_KEY =
    'konooz-user-name-v1';


  const GOOGLE_DRIVE_CONSENT_KEY =
    'konooz-google-drive-consent-v1';


  const GOOGLE_CLIENT_ID =
    '50537229482-vke9e22htlfn1ec570u3ehrba1b4dqjb.apps.googleusercontent.com';


  const GOOGLE_DRIVE_SCOPE =
    'https://www.googleapis.com/auth/drive.file';


  const DRIVE_FOLDER_NAME =
    'Konooz Quotes';


  const DRIVE_OFFERS_FILE_NAME =
    'offers.json';


  const DRIVE_APP_KEY =
    'konoozTravelApp';


  const DRIVE_APP_VALUE =
    'quotes-v1';


  const DRIVE_FOLDER_KIND =
    'quotes-folder';


  const DRIVE_OFFERS_KIND =
    'offers-file';


  /* =========================================================
     GOOGLE STATE
     ========================================================= */

  let googleAccessToken =
    null;


  let googleTokenClient =
    null;


  let googleTokenExpiresAt =
    0;


  let googleDriveInitPromise =
    null;


  let googleAuthRequest =
    null;


  let driveFolderId =
    null;


  let driveOffersFileId =
    null;


  let driveSyncTimer =
    null;


  let driveSyncRunning =
    false;


  let pendingDriveOffers =
    null;


  /* =========================================================
     SELECTORS
     ========================================================= */

  const $ =
    selector =>
      document.querySelector(
        selector
      );


  const $$ =
    selector => [
      ...document.querySelectorAll(
        selector
      )
    ];


  /* =========================================================
     FIXED COPY
     ========================================================= */

  const defaultCopy = {
    brandName:
      'كنوز السفر',

    brandTagline:
      'اسم المستخدم',

    editorEyebrow:
      'عرض مبدئي قابل للتعديل',

    editorTitle:
      'رحلة خاصة',

    editorSubtitle:
      'طلب سفر قابل للتعديل.',

    clientWelcome:
      'عرض مخصص لـ',

    clientHeroTitle:
      '{destination} تنتظركم',

    clientHeroSubtitle:
      'رحلة مصممة بعناية من {origin} إلى {destination}',

    flightsTitle:
      'رحلات الطيران',

    flightsSubtitle:
      'تفاصيل الرحلات',

    hotelsTitle:
      'الفنادق',

    hotelsSubtitle:
      'تفاصيل الإقامة',

    transfersTitle:
      'التنقلات',

    transfersSubtitle:
      'خدمات النقل',

    activitiesTitle:
      'الأنشطة',

    activitiesSubtitle:
      'التجارب المختارة',

    itineraryTitle:
      'برنامج الرحلة',

    itinerarySubtitle:
      'يوماً بيوم',

    priceTitle:
      'إجمالي سعر الباقة',

    notesTitle:
      'ملاحظات مهمة',

    footerText:
      'نسعد بخدمتكم وصناعة رحلة لا تنسى'
  };


  /* =========================================================
     USER PROFILE
     ========================================================= */

  function getUserName() {
    const value =
      localStorage.getItem(
        USER_NAME_KEY
      );


    return (
      value ||
      'اسم المستخدم'
    ).trim();
  }


  function saveUserName(
    value
  ) {
    const userName =
      String(
        value || ''
      ).trim();


    if (
      userName
    ) {
      localStorage.setItem(
        USER_NAME_KEY,
        userName
      );
    } else {
      localStorage.removeItem(
        USER_NAME_KEY
      );
    }


    return getUserName();
  }


  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function toNumber(
    value,
    fallback = 0
  ) {
    const number =
      Number(value);


    return Number.isFinite(
      number
    )
      ? number
      : fallback;
  }


  function escapeHtml(
    value = ''
  ) {
    return String(value)
      .replace(
        /[&<>'"]/g,
        character => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[character]
      );
  }


  function toast(
    message
  ) {
    const element =
      $('#toast');


    if (
      !element
    ) {
      return;
    }


    element.textContent =
      message;


    element.classList.add(
      'show'
    );


    clearTimeout(
      toast.timer
    );


    toast.timer =
      setTimeout(
        () => {
          element.classList.remove(
            'show'
          );
        },
        2400
      );
  }


  function nextFrame() {
    return new Promise(
      resolve => {
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              resolve
            );
          }
        );
      }
    );
  }


  /* =========================================================
     NUMBER FORMAT
     ========================================================= */

  const englishNumber =
    new Intl.NumberFormat(
      'en-US',
      {
        maximumFractionDigits: 2
      }
    );


  const money = {
    format(
      value
    ) {
      return (
        `${englishNumber.format(
          toNumber(
            value
          )
        )} SAR`
      );
    }
  };


  /* =========================================================
     DATE HELPERS
     ========================================================= */

  const clientMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];


  const monthNames = {
    يناير: 1,
    january: 1,
    jan: 1,

    فبراير: 2,
    february: 2,
    feb: 2,

    مارس: 3,
    march: 3,
    mar: 3,

    ابريل: 4,
    أبريل: 4,
    april: 4,
    apr: 4,

    مايو: 5,
    may: 5,

    يونيو: 6,
    june: 6,
    jun: 6,

    يوليو: 7,
    july: 7,
    jul: 7,

    اغسطس: 8,
    أغسطس: 8,
    august: 8,
    aug: 8,

    سبتمبر: 9,
    september: 9,
    sep: 9,
    sept: 9,

    اكتوبر: 10,
    أكتوبر: 10,
    october: 10,
    oct: 10,

    نوفمبر: 11,
    november: 11,
    nov: 11,

    ديسمبر: 12,
    december: 12,
    dec: 12
  };


  function normalizeDigits(
    value = ''
  ) {
    const arabic =
      '٠١٢٣٤٥٦٧٨٩';


    const persian =
      '۰۱۲۳۴۵۶۷۸۹';


    return String(value)
      .replace(
        /[٠-٩]/g,
        digit =>
          arabic.indexOf(
            digit
          )
      )
      .replace(
        /[۰-۹]/g,
        digit =>
          persian.indexOf(
            digit
          )
      );
  }


  function expandedYear(
    value
  ) {
    const year =
      Number(value);


    return year < 100
      ? 2000 + year
      : year;
  }


  function parseFlexibleDate(
    value = ''
  ) {
    const original =
      normalizeDigits(
        value
      )
        .trim()
        .replace(
          /[،,]/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        );


    if (
      !original
    ) {
      return {
        display: '',
        dateKey: '',
        valid: true
      };
    }


    let year;
    let month;
    let day;


    let match =
      original.match(
        /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/
      );


    if (
      match
    ) {
      year =
        Number(
          match[1]
        );


      month =
        Number(
          match[2]
        );


      day =
        Number(
          match[3]
        );
    }


    if (
      !match
    ) {
      match =
        original.match(
          /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/
        );


      if (
        match
      ) {
        day =
          Number(
            match[1]
          );


        month =
          Number(
            match[2]
          );


        year =
          expandedYear(
            match[3]
          );
      }
    }


    if (
      !match
    ) {
      match =
        original.match(
          /^(\d{1,2})\s+([\p{L}.]+)\s+(\d{2,4})$/iu
        );


      if (
        match
      ) {
        day =
          Number(
            match[1]
          );


        month =
          monthNames[
            match[2]
              .replace(
                /\./g,
                ''
              )
              .toLowerCase()
          ];


        year =
          expandedYear(
            match[3]
          );
      }
    }


    if (
      !match
    ) {
      match =
        original.match(
          /^([\p{L}.]+)\s+(\d{1,2})\s+(\d{2,4})$/iu
        );


      if (
        match
      ) {
        month =
          monthNames[
            match[1]
              .replace(
                /\./g,
                ''
              )
              .toLowerCase()
          ];


        day =
          Number(
            match[2]
          );


        year =
          expandedYear(
            match[3]
          );
      }
    }


    const valid =
      Boolean(
        match &&
        Number.isFinite(
          year
        ) &&
        Number.isFinite(
          month
        ) &&
        Number.isFinite(
          day
        ) &&
        year >= 1900 &&
        year <= 2200 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <=
          new Date(
            year,
            month,
            0
          ).getDate()
      );


    if (
      !valid
    ) {
      return {
        display:
          original,

        dateKey:
          '',

        valid:
          false
      };
    }


    return {
      display:
        `${day}/${month}/${year}`,

      dateKey:
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,

      valid:
        true
    };
  }


  function parseFlexibleTime(
    value = ''
  ) {
    const original =
      normalizeDigits(
        value
      )
        .trim()
        .replace(
          /\s+/g,
          ' '
        );


    if (
      !original
    ) {
      return {
        display: '',
        minutes: null,
        valid: true
      };
    }


    const match =
      original.match(
        /^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|A\.M\.|P\.M\.|ص|م|صباحا|صباحًا|مساء|مساءً)?$/i
      );


    if (
      !match
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    let hour =
      Number(
        match[1]
      );


    const minute =
      Number(
        match[2] || 0
      );


    const suffix =
      (
        match[3] ||
        ''
      ).toUpperCase();


    const isPm =
      [
        'PM',
        'P.M.',
        'م',
        'مساء',
        'مساءً'
      ].includes(
        suffix
      );


    const isAm =
      [
        'AM',
        'A.M.',
        'ص',
        'صباحا',
        'صباحًا'
      ].includes(
        suffix
      );


    if (
      minute > 59
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    if (
      (
        isPm ||
        isAm
      ) &&
      (
        hour < 1 ||
        hour > 12
      )
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    if (
      !isPm &&
      !isAm &&
      hour > 23
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    if (
      isPm &&
      hour < 12
    ) {
      hour +=
        12;
    }


    if (
      isAm &&
      hour === 12
    ) {
      hour =
        0;
    }


    return {
      display:
        `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`,

      minutes:
        hour * 60 +
        minute,

      valid:
        true
    };
  }


  function formatClientDate(
    date
  ) {
    if (
      !(date instanceof Date) ||
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }


    return (
      `${String(date.getDate()).padStart(2, '0')} ${clientMonths[date.getMonth()]}`
    );
  }


  function formatFlexibleClientDate(
    value
  ) {
    const parsed =
      parseFlexibleDate(
        value
      );


    if (
      !parsed.dateKey
    ) {
      return value || '';
    }


    const date =
      new Date(
        `${parsed.dateKey}T00:00:00`
      );


    return formatClientDate(
      date
    );
  }


  function hotelDateTimestamp(
    value
  ) {
    const parsed =
      parseFlexibleDate(
        value
      );


    if (
      !parsed.dateKey
    ) {
      return null;
    }


    const time =
      new Date(
        `${parsed.dateKey}T00:00:00`
      ).getTime();


    return Number.isFinite(
      time
    )
      ? time
      : null;
  }


  function clientDateTime(
    dateValue = '',
    timeValue = ''
  ) {
    const dateText =
      dateValue ||
      'غير محدد';


    const timeText =
      timeValue
        ? ` - ${timeValue}`
        : '';


    return (
      `${dateText}${timeText}`
    );
  }


  function dayCount() {
    const startInput =
      $('#startDate');


    const endInput =
      $('#endDate');


    if (
      !startInput ||
      !endInput
    ) {
      return 0;
    }


    const start =
      new Date(
        `${startInput.value}T00:00:00`
      );


    const end =
      new Date(
        `${endInput.value}T00:00:00`
      );


    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      ) ||
      end < start
    ) {
      return 0;
    }


    return (
      Math.round(
        (
          end -
          start
        ) /
        86400000
      ) +
      1
    );
  }


  /* =========================================================
     FLIGHT SEGMENTS
     ========================================================= */

  function createSegment(
    from = '',
    to = '',
    departureDate = '',
    departureTime = '',
    arrivalDate = '',
    arrivalTime = '',
    price = 0,
    extraDetails = ''
  ) {
    return {
      id:
        `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

      from,
      to,
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime,
      price,
      extraDetails
    };
  }


  function ensureFlightSegments(
    item
  ) {
    if (
      item.category !==
      'flight'
    ) {
      return [];
    }


    if (
      !Array.isArray(
        item.segments
      )
    ) {
      item.segments =
        [];


      if (
        item.departureDate ||
        item.returnDate
      ) {
        item.segments.push(
          createSegment(
            $('#origin')?.value || '',
            $('#destination')?.value || '',
            item.departureDate || '',
            item.departureTime || ''
          )
        );


        item.segments.push(
          createSegment(
            $('#destination')?.value || '',
            $('#origin')?.value || '',
            item.returnDate || '',
            item.returnTime || ''
          )
        );
      }


      if (
        !item.segments.length
      ) {
        item.segments.push(
          createSegment()
        );
      }


      delete item.departureDate;
      delete item.departureTime;
      delete item.returnDate;
      delete item.returnTime;
    }


    item.segments =
      item.segments.map(
        segment => ({
          id:
            segment.id ||
            `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

          from:
            segment.from || '',

          to:
            segment.to || '',

          departureDate:
            segment.departureDate || '',

          departureTime:
            segment.departureTime || '',

          arrivalDate:
            segment.arrivalDate || '',

          arrivalTime:
            segment.arrivalTime || '',

          price:
            Math.max(
              0,
              toNumber(
                segment.price
              )
            ),

          extraDetails:
            segment.extraDetails || ''
        })
      );


    return item.segments;
  }


  /* =========================================================
     SAMPLE
     ========================================================= */

  const sample = {
    services: [
      {
        id:
          'f1',

        category:
          'flight',

        name:
          'تذاكر الطيران الدولي',

        details:
          'الدرجة السياحية',

        segments: [
          {
            id:
              'seg-outbound',

            from:
              'جدة',

            to:
              'كوالالمبور',

            departureDate:
              '6/10/2026',

            departureTime:
              '9:55 PM',

            arrivalDate:
              '7/10/2026',

            arrivalTime:
              '9:30 AM',

            price:
              0,

            extraDetails:
              ''
          },

          {
            id:
              'seg-return',

            from:
              'كوالالمبور',

            to:
              'جدة',

            departureDate:
              '20/10/2026',

            departureTime:
              '2:20 PM',

            arrivalDate:
              '20/10/2026',

            arrivalTime:
              '9:10 PM',

            price:
              0,

            extraDetails:
              ''
          }
        ],

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h1',

        category:
          'hotel',

        city:
          'سلنجور',

        name:
          'فندق صن واي برايميد',

        details:
          'غرفة مطلة على الملاهي',

        checkIn:
          '6/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '8/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h2',

        category:
          'hotel',

        city:
          'لانكاوي',

        name:
          'منتجع برجايا',

        details:
          'غرفة مع جاكوزي',

        checkIn:
          '8/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '11/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h3',

        category:
          'hotel',

        city:
          'بينينغ',

        name:
          'فندق رويال بارك',

        details:
          'بلكونة مطلة على البحر',

        checkIn:
          '11/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '13/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h4',

        category:
          'hotel',

        city:
          'كاميرون',

        name:
          'فندق زينث كاميرون',

        details:
          'غرفة ديلوكس',

        checkIn:
          '13/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '15/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h5',

        category:
          'hotel',

        city:
          'كوالالمبور',

        name:
          'فندق جي دبليو ماريوت',

        details:
          'غرفة ديلوكس',

        checkIn:
          '15/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '18/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h6',

        category:
          'hotel',

        city:
          'كوالالمبور',

        name:
          'فندق تريدرس',

        details:
          'غرفة مطلة على البرجين',

        checkIn:
          '18/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '20/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          't1',

        category:
          'transfer',

        name:
          'التنقلات بين المدن والمطارات',

        details:
          'سيارة خاصة',

        costMode:
          'total',

        qty:
          1,

        cost:
          0
      }
    ],

    itinerary:
      [],

    hotelCities: [
      'سلنجور',
      'لانكاوي',
      'بينينغ',
      'كاميرون',
      'كوالالمبور'
    ]
  };


  /* =========================================================
     STATE
     ========================================================= */

  let state = {
    services:
      structuredClone(
        sample.services
      ),

    itinerary:
      [],

    childAges:
      [],

    hotelCities:
      structuredClone(
        sample.hotelCities
      ),

    copy: {
      ...structuredClone(
        defaultCopy
      ),

      brandTagline:
        getUserName()
    }
  };


  /* =========================================================
     STATE MIGRATION
     ========================================================= */

  function ensureStateStructure() {
    if (
      !Array.isArray(
        state.services
      )
    ) {
      state.services =
        [];
    }


    if (
      !Array.isArray(
        state.itinerary
      )
    ) {
      state.itinerary =
        [];
    }


    if (
      !Array.isArray(
        state.childAges
      )
    ) {
      state.childAges =
        [];
    }


    if (
  !Array.isArray(
    state.tripStops
  )
) {
  state.tripStops =
    [];
}

    state.copy = {
      ...structuredClone(
        defaultCopy
      ),

      brandTagline:
        getUserName()
    };


    if (
      !Array.isArray(
        state.hotelCities
      )
    ) {
      state.hotelCities =
        Array.isArray(
          state.hotelCountries
        )
          ? [
              ...state.hotelCountries
            ]
          : [];
    }


    delete state.hotelCountries;


    state.services.forEach(
      item => {
        item.id =
          item.id ||
          `service-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;


        item.qty =
          Math.max(
            1,
            toNumber(
              item.qty,
              1
            )
          );


        item.cost =
          Math.max(
            0,
            toNumber(
              item.cost
            )
          );


        item.costMode =
          item.costMode ===
          'unit'
            ? 'unit'
            : 'total';


        if (
          item.category ===
          'hotel'
        ) {
          item.city =
            String(
              item.city ||
              item.country ||
              'غير محددة'
            ).trim();


          delete item.country;
          delete item.breakfastType;
          delete item.breakfastOther;


          item.checkInTime =
            item.checkInTime ||
            '';


          item.checkOutTime =
            item.checkOutTime ||
            '';


          item.hotelTax =
            Math.max(
              0,
              toNumber(
                item.hotelTax
              )
            );


          if (
            item.city &&
            !state.hotelCities.includes(
              item.city
            )
          ) {
            state.hotelCities.push(
              item.city
            );
          }
        }


        if (
          item.category ===
          'flight'
        ) {
          ensureFlightSegments(
            item
          );
        }
      }
    );


    state.hotelCities = [
      ...new Set(
        state.hotelCities
          .map(
            value =>
              String(
                value
              ).trim()
          )
          .filter(
            Boolean
          )
      )
    ];
  }


  /* =========================================================
     HOTEL
     ========================================================= */

  function hotelNights(
    item
  ) {
    const checkIn =
      hotelDateTimestamp(
        item.checkIn
      );


    const checkOut =
      hotelDateTimestamp(
        item.checkOut
      );


    if (
      checkIn === null ||
      checkOut === null
    ) {
      return 0;
    }


    return Math.max(
      0,

      Math.round(
        (
          checkOut -
          checkIn
        ) /
        86400000
      )
    );
  }


  /* =========================================================
     PRICING
     ========================================================= */

  function serviceTotal(
    item
  ) {
    const enteredCost =
      Math.max(
        0,
        toNumber(
          item.cost
        )
      );


    const baseCost =
      item.costMode ===
      'unit'
        ? (
            Math.max(
              0,
              toNumber(
                item.qty
              )
            ) *
            enteredCost
          )
        : enteredCost;


    const hotelTax =
      item.category ===
      'hotel'
        ? Math.max(
            0,
            toNumber(
              item.hotelTax
            )
          )
        : 0;


    const flightPrices =
      item.category ===
      'flight'
        ? ensureFlightSegments(
            item
          ).reduce(
            (
              sum,
              segment
            ) =>
              sum +
              Math.max(
                0,
                toNumber(
                  segment.price
                )
              ),
            0
          )
        : 0;


    return (
      baseCost +
      hotelTax +
      flightPrices
    );
  }


  function totals() {
    const cost =
      state.services.reduce(
        (
          sum,
          item
        ) =>
          sum +
          serviceTotal(
            item
          ),
        0
      );


    const markupValue =
      Math.max(
        0,
        toNumber(
          $('#markupValue')?.value
        )
      );


    const markupType =
      $('#markupType')?.value ||
      'percent';


    const profit =
      markupType ===
      'fixed'
        ? markupValue
        : (
            cost *
            markupValue /
            100
          );


    const subtotal =
      cost +
      profit;


    const vatEnabled =
      Boolean(
        $('#vatEnabled')?.checked
      );


    const vat =
      vatEnabled
        ? subtotal * .15
        : 0;


    const total =
      subtotal +
      vat;


    const travelers =
      Math.max(
        0,
        toNumber(
          $('#adults')?.value
        )
      ) +
      Math.max(
        0,
        toNumber(
          $('#children')?.value
        )
      );


    return {
      cost,
      profit,
      subtotal,
      vat,
      total,
      travelers,

      perTraveler:
        travelers
          ? total /
            travelers
          : 0,

      margin:
        subtotal
          ? (
              profit /
              subtotal *
              100
            )
          : 0
    };
  }


  /* =========================================================
     FIXED COPY
     ========================================================= */

  function replaceCopyTokens(
    value = ''
  ) {
    const destination =
      $('#destination')
        ?.value
        .trim()
        .split(
          /\s+-\s+/
        )[0]
        .trim() ||
      '';


    const origin =
      $('#origin')
        ?.value
        .trim() ||
      '';


    return String(
      value
    )
      .replaceAll(
        '{destination}',
        destination
      )
      .replaceAll(
        '{origin}',
        origin
      );
  }


  function applyCopy() {
    ensureStateStructure();


    state.copy = {
      ...structuredClone(
        defaultCopy
      ),

      brandTagline:
        getUserName()
    };


    const copy =
      state.copy;


    document.title =
      `${copy.brandName} - عروض السفر`;


    const values = {
      appBrandName:
        copy.brandName,

      appBrandTagline:
        copy.brandTagline,

      editorEyebrow:
        copy.editorEyebrow,

      editorTitle:
        copy.editorTitle,

      editorSubtitle:
        copy.editorSubtitle,

      clientBrandName:
        copy.brandName,

      clientBrandTagline:
        copy.brandTagline,

      clientWelcomeText:
        copy.clientWelcome,

      clientFlightsTitle:
        copy.flightsTitle,

      clientFlightsSubtitle:
        copy.flightsSubtitle,

      clientHotelsTitle:
        copy.hotelsTitle,

      clientHotelsSubtitle:
        copy.hotelsSubtitle,

      clientTransfersTitle:
        copy.transfersTitle,

      clientTransfersSubtitle:
        copy.transfersSubtitle,

      clientActivitiesTitle:
        copy.activitiesTitle,

      clientActivitiesSubtitle:
        copy.activitiesSubtitle,

      clientItineraryTitle:
        copy.itineraryTitle,

      clientItinerarySubtitle:
        copy.itinerarySubtitle,

      clientPriceTitle:
        copy.priceTitle,

      clientNotesTitle:
        copy.notesTitle,

      clientFooterBrand:
        `${copy.brandName} للسياحة والسفر`,

      clientFooterText:
        copy.footerText,

      clientFooterThanks:
        `شكراً لاختياركم ${copy.brandName}`
    };


    Object.entries(
      values
    ).forEach(
      (
        [
          id,
          value
        ]
      ) => {
        const element =
          $(`#${id}`);


        if (
          element
        ) {
          element.textContent =
            value;
        }
      }
    );


    /*
     * الشعار الثابت.
     */
    $$('.brand-mark')
      .forEach(
        mark => {
          mark.replaceChildren();


          const image =
            document.createElement(
              'img'
            );

image.src =
  new URL(
    './assets/logo.png',
    window.location.href
  ).href;


image.alt =
  defaultCopy.brandName;


          image.className =
            'brand-logo-image';


          image.onerror =
            () => {
              mark.replaceChildren();


              mark.textContent =
                defaultCopy.brandName
                  .trim()
                  .slice(
                    0,
                    1
                  ) ||
                'ك';
            };


          mark.appendChild(
            image
          );
        }
      );


    $$(
      '[data-copy-key]'
    ).forEach(
      input => {
        const key =
          input.dataset.copyKey;


        const editable =
          key ===
          'brandTagline';


        if (
          'readOnly' in input
        ) {
          input.readOnly =
            !editable;
        }


        if (
          input.tagName ===
          'SELECT'
        ) {
          input.disabled =
            !editable;
        }


        input.classList.toggle(
          'copy-field-locked',
          !editable
        );


        if (
          document.activeElement !==
          input
        ) {
          input.value =
            editable
              ? getUserName()
              : (
                  defaultCopy[
                    key
                  ] ||
                  ''
                );
        }
      }
    );
  }


  /* =========================================================
     SERVICE LABELS
     ========================================================= */

  function categoryLabel(
    category
  ) {
    const copyKeys = {
      flight:
        'flightsTitle',

      hotel:
        'hotelsTitle',

      transfer:
        'transfersTitle',

      activity:
        'activitiesTitle'
    };


    return (
      state.copy[
        copyKeys[
          category
        ]
      ] ||
      categories[
        category
      ]?.label ||
      category
    );
  }


  function serviceDetailsLabel(
    item
  ) {
    if (
      item.category ===
      'hotel'
    ) {
      return 'نوع الغرفة';
    }


    if (
      item.category ===
      'flight'
    ) {
      return 'درجة الطيران';
    }


    return 'التفاصيل';
  }


  function serviceQtyLabel(
  item
) {
  if (
    item.category ===
    'hotel'
  ) {
    return 'عدد الأشخاص';
  }


  if (
    item.category ===
    'flight'
  ) {
    return 'عدد المسافرين';
  }


  return 'الكمية';
}


  /* =========================================================
     SERVICE SCHEDULE
     ========================================================= */

  function serviceScheduleFields(
    item
  ) {
    if (
      item.category ===
      'hotel'
    ) {
      return `
        <div class="service-dates service-dates-hotel">

          <label>
            المدينة

            <input
              data-field="city"
              type="text"
              list="hotelCitiesList"
              value="${escapeHtml(item.city || '')}"
            >
          </label>

          <label>
  تصنيف الفندق

  <input
    data-field="hotelStars"
    type="text"
    value="${escapeHtml(
      item.hotelStars ||
      ''
    )}"
    placeholder="مثال: 5 نجوم"
  >
</label>


<label>
  مساحة الغرفة

  <input
    data-field="roomSize"
    type="text"
    value="${escapeHtml(
      item.roomSize ||
      ''
    )}"
    placeholder="مثال: 36 m²"
    dir="ltr"
  >
</label>


<label>
  الوجبات

  <input
    data-field="board"
    type="text"
    value="${escapeHtml(
      item.board ||
      ''
    )}"
    placeholder="مثال: إفطار شامل"
  >
</label>


<label>
  سياسة الإلغاء

  <input
    data-field="cancellation"
    type="text"
    value="${escapeHtml(
      item.cancellation ||
      ''
    )}"
    placeholder="مثال: غير قابل للاسترداد"
  >
</label>

          <label>
            تاريخ الدخول

            <input
              class="hotel-date-input"
              data-field="checkIn"
              data-hotel-date="true"
              type="text"
              value="${escapeHtml(item.checkIn || '')}"
              placeholder="18/10/2026"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            وقت الدخول

            <input
              class="hotel-time-input"
              data-field="checkInTime"
              data-hotel-time="true"
              type="text"
              value="${escapeHtml(item.checkInTime || '')}"
              placeholder="15:00"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            تاريخ الخروج

            <input
              class="hotel-date-input"
              data-field="checkOut"
              data-hotel-date="true"
              type="text"
              value="${escapeHtml(item.checkOut || '')}"
              placeholder="20/10/2026"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            وقت الخروج

            <input
              class="hotel-time-input"
              data-field="checkOutTime"
              data-hotel-time="true"
              type="text"
              value="${escapeHtml(item.checkOutTime || '')}"
              placeholder="12:00"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            ضريبة الفندق

            <input
              data-field="hotelTax"
              type="number"
              min="0"
              step="0.01"
              value="${Math.max(0, toNumber(item.hotelTax))}"
            >
          </label>
<label class="hotel-source-url-field">
  رابط الفندق

  <div class="hotel-source-url-control">

    <input
      data-field="sourceUrl"
      type="url"
      value="${escapeHtml(
        item.sourceUrl ||
        ''
      )}"
      placeholder="https://..."
      dir="ltr"
      autocomplete="off"
    >

    <button
      class="open-hotel-source-btn"
      type="button"
      title="فتح رابط الفندق"
    >
      فتح
    </button>

  </div>
</label>

        </div>
      `;
    }


    if (
  item.category ===
  'flight'
) {
  const flightType =
    String(
      item?.flightType ||
      'international'
    )
      .trim()
      .toLowerCase();


  return `
    <div class="service-dates flight-segments">

      <div class="flight-type-field">

        <label>
          نوع الطيران

          <select data-field="flightType">

            <option
              value="international"
              ${
                flightType ===
                  'international'
                  ? 'selected'
                  : ''
              }
            >
              طيران دولي
            </option>


            <option
              value="domestic"
              ${
                flightType ===
                  'domestic'
                  ? 'selected'
                  : ''
              }
            >
              طيران داخلي
            </option>

          </select>

        </label>

      </div>

          <div class="flight-segments-head">

            <div>

              <strong>
                رحلات ومواعيد الطيران
              </strong>

              <span>
                اسحب المقاطع لتغيير ترتيبها.
              </span>

            </div>

            <button
              class="add-flight-segment"
              type="button"
            >
              + إضافة رحلة
            </button>

          </div>

          <div class="flight-segments-list">

            ${
              ensureFlightSegments(
                item
              )
                .map(
                  (
                    segment,
                    index
                  ) => `
                    <details
                      class="flight-segment"
                      data-segment-id="${escapeHtml(segment.id)}"
                      ${index === 0 ? 'open' : ''}
                    >

                      <summary>

                        <b
                          class="segment-drag-handle"
                          draggable="true"
                        >
                          ⋮⋮
                        </b>

                        <span>
  ${
    ensureFlightSegments(item).length === 2
      ? (
          index === 0
            ? 'رحلة الذهاب'
            : 'رحلة العودة'
        )
      : `الرحلة ${index + 1}`
  }
</span>

                        <strong>
                          ${escapeHtml(
                            [
                              segment.from,
                              segment.to
                            ]
                              .filter(Boolean)
                              .join(' ← ') ||
                            'رحلة جديدة'
                          )}
                        </strong>

                        <small>
                          ${escapeHtml(
                            [
                              segment.departureDate,
                              segment.departureTime
                            ]
                              .filter(Boolean)
                              .join('، ') ||
                            'أضف الموعد'
                          )}
                        </small>

                      </summary>

                      <div class="segment-fields">

                        <label>
                          من

                          <input
                            data-segment-field="from"
                            type="text"
                            value="${escapeHtml(segment.from || '')}"
                          >
                        </label>

                        <label>
                          إلى

                          <input
                            data-segment-field="to"
                            type="text"
                            value="${escapeHtml(segment.to || '')}"
                          >
                        </label>

                        <label>
                          تاريخ الإقلاع

                          <input
                            data-segment-field="departureDate"
                            data-segment-kind="date"
                            type="text"
                            value="${escapeHtml(segment.departureDate || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          وقت الإقلاع

                          <input
                            data-segment-field="departureTime"
                            data-segment-kind="time"
                            type="text"
                            value="${escapeHtml(segment.departureTime || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          تاريخ الوصول

                          <input
                            data-segment-field="arrivalDate"
                            data-segment-kind="date"
                            type="text"
                            value="${escapeHtml(segment.arrivalDate || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          وقت الوصول

                          <input
                            data-segment-field="arrivalTime"
                            data-segment-kind="time"
                            type="text"
                            value="${escapeHtml(segment.arrivalTime || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          سعر الرحلة

                          <input
                            data-segment-field="price"
                            type="number"
                            min="0"
                            step="0.01"
                            value="${Math.max(0, toNumber(segment.price))}"
                          >
                        </label>

                        <label class="segment-extra-details">
                          تفاصيل إضافية

                          <input
                            data-segment-field="extraDetails"
                            type="text"
                            value="${escapeHtml(segment.extraDetails || '')}"
                          >
                        </label>

                      </div>

                      <button
                        class="remove-flight-segment"
                        type="button"
                      >
                        حذف هذه الرحلة
                      </button>

                    </details>
                  `
                )
                .join('')
            }

          </div>

        </div>
      `;
    }


    return '';
  }


  function serviceRow(
    item
  ) {
    const hotelDragHandle =
      item.category ===
      'hotel'
        ? `
          <div
            class="hotel-drag-handle"
            draggable="true"
            title="اسحب لتغيير ترتيب الفندق"
          >

            <span class="hotel-drag-grip">
              ⋮⋮
            </span>

            <span>
              اسحب لترتيب الفندق
            </span>

          </div>
        `
        : '';


    return `
      <div
        class="service-row ${
          item.category ===
          'hotel'
            ? 'hotel-service-row'
            : ''
        }"
        data-id="${escapeHtml(item.id)}"
        ${
          item.category ===
          'hotel'
            ? `data-hotel-city="${escapeHtml(item.city || '')}"`
            : ''
        }
      >

        ${hotelDragHandle}

        <label>
          اسم الخدمة

          <input
            data-field="name"
            type="text"
            value="${escapeHtml(item.name || '')}"
          >
        </label>

        <label>
          ${serviceDetailsLabel(item)}

          <input
            data-field="details"
            type="text"
            value="${escapeHtml(item.details || '')}"
            placeholder="${
              item.category ===
              'hotel'
                ? 'مثال: غرفة ديلوكس مطلة على البحر'
                : item.category ===
                  'flight'
                    ? 'مثال: الدرجة السياحية'
                    : ''
            }"
          >
        </label>

        <label>
          نوع التكلفة

          <select data-field="costMode">

            <option
              value="total"
              ${
                item.costMode !==
                'unit'
                  ? 'selected'
                  : ''
              }
            >
              إجمالية
            </option>

            <option
              value="unit"
              ${
                item.costMode ===
                'unit'
                  ? 'selected'
                  : ''
              }
            >
              للوحدة
            </option>

          </select>
        </label>

        <label>
          ${serviceQtyLabel(item)}

          <input
            data-field="qty"
            type="number"
            min="1"
            step="1"
            value="${Math.max(1, toNumber(item.qty, 1))}"
          >
        </label>

        <label class="cost-field">

          <span>
            ${
              item.costMode ===
              'unit'
                ? 'تكلفة الوحدة'
                : 'التكلفة الإجمالية'
            }
          </span>

          <input
            data-field="cost"
            type="number"
            min="0"
            step="0.01"
            value="${Math.max(0, toNumber(item.cost))}"
          >

        </label>

        <div class="line-total">
          ${money.format(serviceTotal(item))}
        </div>

        <button
          class="remove-service"
          type="button"
          aria-label="حذف الخدمة"
        >
          ×
        </button>

        ${serviceScheduleFields(item)}

      </div>
    `;
  }


  function hotelCityGroupsHtml(
  items
) {
  const allTripStops =
  Array.isArray(
    state.tripStops
  )
    ? state.tripStops
        .map(
          (
            stop,
            index
          ) => ({
            ...stop,

            tripStopIndex:
              index
          })
        )
        .filter(
          stop =>
            String(
              stop?.city ||
              ''
            ).trim()
        )
    : [];


/*
 * نحفظ أرقام محطات العبور الأصلية.
 * هذه الأرقام لا تتغير حتى يظل tripStopIndex
 * متطابقًا مع Luna والمسار الكامل.
 */
const passThroughIndexes =
  new Set(
    allTripStops
      .filter(
        stop => {
          const stopType =
            stop?.stopType ===
              'pass_through'
              ? 'pass_through'
              : 'stay';


          const parsedNights =
            Number.parseInt(
              stop?.nights,
              10
            );


          return (
            stopType ===
              'pass_through' ||
            (
              Number.isFinite(
                parsedNights
              ) &&
              parsedNights <= 0
            )
          );
        }
      )
      .map(
        stop =>
          stop.tripStopIndex
      )
  );


/*
 * قسم الفنادق يعرض محطات الإقامة فقط.
 * محطة العبور تبقى في state.tripStops
 * ولكنها لا تظهر هنا.
 */
const tripStops =
  allTripStops.filter(
    stop =>
      !passThroughIndexes.has(
        stop.tripStopIndex
      )
  );


  /*
   * العروض القديمة أو العروض التي لم تأت من
   * نموذج المدن المتعددة تستمر بنفس النظام القديم.
   */
  if (
  !allTripStops.length
) {
    return state.hotelCities
      .map(
        (
          city,
          cityIndex
        ) => {
          const hotels =
            items.filter(
              item =>
                item.city ===
                city
            );


          return `
            <section
              class="hotel-city-group"
              data-city="${escapeHtml(city)}"
            >

              <div class="hotel-city-head">

                <label class="hotel-city-name-field">

                  المدينة

                  <input
                    class="city-name-input"
                    data-city-index="${cityIndex}"
                    type="text"
                    value="${escapeHtml(city)}"
                  >

                </label>

                <button
                  class="delete-hotel-city-btn"
                  type="button"
                  data-city="${escapeHtml(city)}"
                  aria-label="حذف المدينة"
                  title="حذف المدينة"
                >
                  حذف
                </button>

              </div>


              <div class="hotel-city-list">

                ${
                  hotels.length
                    ? hotels
                        .map(
                          serviceRow
                        )
                        .join('')
                    : `
                      <p class="city-empty">
                        لا توجد فنادق في هذه المدينة.
                      </p>
                    `
                }

              </div>

            </section>
          `;
        }
      )
      .join('');
  }


  /*
   * في الرحلات متعددة المدن:
   * التجميع يكون حسب رقم الإقامة وليس اسم المدينة.
   *
   * لذلك بانكوك الأولى تختلف عن بانكوك الأخيرة.
   */
  const usedHotelIds =
    new Set();


  const routeGroupsHtml =
    tripStops
      .map(
        stop => {
          const tripStopIndex =
            stop.tripStopIndex;


          const city =
            String(
              stop.city ||
              ''
            ).trim();


          const nights =
            Math.max(
              1,
              Number.parseInt(
                stop.nights,
                10
              ) ||
              1
            );


          const hotels =
            items.filter(
              item =>
                Number.parseInt(
                  item.tripStopIndex,
                  10
                ) ===
                  tripStopIndex
            );


          hotels.forEach(
            hotel => {
              usedHotelIds.add(
                hotel.id
              );
            }
          );


          return `
            <section
              class="hotel-city-group"
              data-trip-stop-index="${tripStopIndex}"
              data-city="${escapeHtml(city)}"
            >

              <div class="hotel-city-head">

                <label class="hotel-city-name-field">

                  الإقامة ${tripStopIndex + 1}
                  |
                  ${
                    nights === 1
                      ? 'ليلة واحدة'
                      : `${nights} ليال`
                  }

                  <input
                    type="text"
                    value="${escapeHtml(city)}"
                    readonly
                  >

                </label>

              </div>


              <div class="hotel-city-list">

                ${
                  hotels.length
                    ? hotels
                        .map(
                          serviceRow
                        )
                        .join('')
                    : `
                      <p class="city-empty">
                        لا توجد فنادق في هذه الإقامة.
                      </p>
                    `
                }

              </div>

            </section>
          `;
        }
      )
      .join('');


  /*
   * نحافظ كذلك على أي فنادق أضيفت يدويًا
   * وليست مرتبطة بمحطة من مسار العميل.
   */
  const remainingHotels =
  items.filter(
    item => {
      const itemTripStopIndex =
        Number.parseInt(
          item?.tripStopIndex,
          10
        );


      /*
       * حتى لو بقي فندق قديم مرتبط بمحطة عبور،
       * لا نعرضه كمدينة إضافية.
       */
      if (
        Number.isFinite(
          itemTripStopIndex
        ) &&
        passThroughIndexes.has(
          itemTripStopIndex
        )
      ) {
        return false;
      }


      return !usedHotelIds.has(
        item.id
      );
    }
  );


  const remainingCities =
    [
      ...new Set(
        remainingHotels
          .map(
            item =>
              String(
                item.city ||
                ''
              ).trim()
          )
          .filter(
            Boolean
          )
      )
    ];


  const manualGroupsHtml =
    remainingCities
      .map(
        city => {
          const hotels =
            remainingHotels.filter(
              item =>
                item.city ===
                  city
            );


          return `
            <section
              class="hotel-city-group"
              data-city="${escapeHtml(city)}"
            >

              <div class="hotel-city-head">

                <label class="hotel-city-name-field">

                  مدينة إضافية

                  <input
                    type="text"
                    value="${escapeHtml(city)}"
                    readonly
                  >

                </label>

              </div>


              <div class="hotel-city-list">

                ${
                  hotels
                    .map(
                      serviceRow
                    )
                    .join('')
                }

              </div>

            </section>
          `;
        }
      )
      .join('');


  return (
    routeGroupsHtml +
    manualGroupsHtml
  );
}

function deleteHotelCity(
  city
) {
  const cityName =
    String(
      city || ''
    ).trim();


  if (
    !cityName
  ) {
    return;
  }


  const hotelsInCity =
    state.services.filter(
      item =>
        item.category ===
          'hotel' &&
        String(
          item.city || ''
        ).trim() ===
          cityName
    );


  /*
   * إذا كانت المدينة تحتوي على فنادق
   * نطلب تأكيد قبل حذفها.
   */
  if (
    hotelsInCity.length >
    0
  ) {
    const confirmed =
      window.confirm(
        `يوجد ${hotelsInCity.length} فندق في ${cityName}. هل تريد حذف المدينة وجميع فنادقها؟`
      );


    if (
      !confirmed
    ) {
      return;
    }


    state.services =
      state.services.filter(
        item =>
          !(
            item.category ===
              'hotel' &&
            String(
              item.city || ''
            ).trim() ===
              cityName
          )
      );
  }


  /*
   * حذف المدينة نفسها من القائمة.
   */
  state.hotelCities =
    state.hotelCities.filter(
      currentCity =>
        String(
          currentCity || ''
        ).trim() !==
          cityName
    );


  renderServices();


  updateSummary();


  currentOfferTouched =
    true;


  scheduleAutoSave();


  toast(
    `تم حذف ${cityName}`
  );
}

  function categoryGroups() {
    return Object.keys(
      categories
    )
      .map(
        key => ({
          key,

          items:
            state.services.filter(
              item =>
                item.category ===
                key
            )
        })
      )
      .filter(
        group =>
          group.items.length ||
          (
            group.key ===
              'hotel' &&
            state.hotelCities.length
          )
      );
  }


  function renderServices() {
    ensureStateStructure();


    const list =
      $('#servicesList');


    if (
      !list
    ) {
      return;
    }


    const groups =
      categoryGroups();


    list.innerHTML =
      groups.length
        ? groups
            .map(
              group => `
                <section class="service-group">

                  <div class="service-group-head">

                    <span class="service-icon">
                      ${categories[group.key].icon}
                    </span>

                    <strong>
  ${escapeHtml(categoryLabel(group.key))}
</strong>


${
  group.key !== 'flight' &&
  group.key !== 'hotel'
    ? `
      <button
        class="btn btn-ghost quick-add-transfer-btn"
        type="button"
      >
        + إضافة نقل
      </button>
    `
    : ''
}

</div>

                  ${
                    group.key ===
                    'hotel'
                      ? hotelCityGroupsHtml(
                          group.items
                        )
                      : group.items
                          .map(
                            serviceRow
                          )
                          .join('')
                  }

                </section>
              `
            )
            .join('')
        : `
          <div class="sub-card">
            <p>
              لا توجد خدمات بعد.
            </p>
          </div>
        `;


    const dataList =
      $('#hotelCitiesList');


    if (
      dataList
    ) {
      dataList.innerHTML =
        state.hotelCities
          .map(
            city =>
              `<option value="${escapeHtml(city)}"></option>`
          )
          .join('');
    }
  }


  /* =========================================================
     CHILD AGES
     ========================================================= */

  function renderChildAges() {
    const childrenInput =
      $('#children');


    const wrap =
      $('#childAgesWrap');


    const list =
      $('#childAges');


    if (
      !childrenInput ||
      !wrap ||
      !list
    ) {
      return;
    }


    const count =
      Math.max(
        0,
        Math.floor(
          toNumber(
            childrenInput.value
          )
        )
      );


    while (
      state.childAges.length <
      count
    ) {
      state.childAges.push(
        6
      );
    }


    state.childAges =
      state.childAges.slice(
        0,
        count
      );


    wrap.hidden =
      count === 0;


    list.innerHTML =
      state.childAges
        .map(
          (
            age,
            index
          ) => `
            <label class="age-field">

              الطفل ${index + 1}

              <input
                class="child-age"
                data-index="${index}"
                type="number"
                min="0"
                max="17"
                value="${age}"
              >

            </label>
          `
        )
        .join('');
  }


  /* =========================================================
     ITINERARY
     ========================================================= */

  function renderItinerary() {
    const list =
      $('#itineraryList');


    if (
      !list
    ) {
      return;
    }


    list.innerHTML =
      state.itinerary.length
        ? state.itinerary
            .map(
              (
                day,
                index
              ) => `
                <article
                  class="day-card"
                  draggable="true"
                  data-index="${index}"
                >

                  <div class="day-handle">
                    ${index + 1}
                  </div>

                  <label>
                    عنوان اليوم

                    <input
                      data-day-field="title"
                      type="text"
                      value="${escapeHtml(day.title || '')}"
                    >
                  </label>

                  <label>
                    التفاصيل

                    <input
                      data-day-field="details"
                      type="text"
                      value="${escapeHtml(day.details || '')}"
                    >
                  </label>

                  <button
                    class="remove-service remove-day"
                    type="button"
                  >
                    ×
                  </button>

                </article>
              `
            )
            .join('')
        : `
          <div class="empty-itinerary">

            <strong>
              جدول الأنشطة فارغ
            </strong>

            <span>
              أضف يوماً عندما تحتاج إلى برنامج تفصيلي.
            </span>

          </div>
        `;
  }


  /* =========================================================
     SUMMARY
     ========================================================= */

  function updateDuration() {
    const display =
      $('#durationDisplay');


    if (
      !display
    ) {
      return;
    }


    const days =
      dayCount();


    const nights =
      Math.max(
        0,
        days - 1
      );


    display.value =
      days
        ? `${days} أيام / ${nights} ليالٍ`
        : 'تحقق من التواريخ';
  }


  function setText(
    selector,
    value
  ) {
    const element =
      $(
        selector
      );


    if (
      element
    ) {
      element.textContent =
        value;
    }
  }


  function updateSummary() {
    const result =
      totals();


    setText(
      '#costTotal',
      money.format(
        result.cost
      )
    );


    setText(
      '#profitTotal',
      money.format(
        result.profit
      )
    );


    setText(
      '#subtotalTotal',
      money.format(
        result.subtotal
      )
    );


    setText(
      '#vatTotal',
      money.format(
        result.vat
      )
    );


    setText(
      '#grandTotal',
      money.format(
        result.total
      )
    );


    setText(
      '#perTraveler',
      `${money.format(result.perTraveler)} للفرد`
    );


    setText(
      '#marginPercent',
      `${englishNumber.format(result.margin)}%`
    );


    const marginBar =
      $('#marginBar');


    if (
      marginBar
    ) {
      marginBar.style.width =
        `${Math.min(100, result.margin * 2.2)}%`;
    }


    const vatRow =
      $('#vatRow');


    if (
      vatRow
    ) {
      vatRow.classList.toggle(
        'muted-row',
        !$('#vatEnabled')?.checked
      );
    }


    const suffix =
      $('.input-suffix');


    if (
      suffix
    ) {
      suffix.textContent =
        $('#markupType')?.value ===
        'fixed'
          ? 'SAR'
          : '%';
    }


    setText(
      '#travelerCountBadge',

      result.travelers ===
      1
        ? 'مسافر واحد'
        : `${result.travelers} مسافرين`
    );


    updateDuration();


    validate(
      false
    );
  }


  /* =========================================================
     VALIDATION
     ========================================================= */

  function validate(
    showBanner = true
  ) {
    const errors =
      [];


    if (
      !$('#origin')
        ?.value
        .trim()
    ) {
      errors.push(
        'أدخل مدينة المغادرة'
      );
    }


    if (
      !$('#destination')
        ?.value
        .trim()
    ) {
      errors.push(
        'أدخل الوجهة'
      );
    }


    if (
      dayCount() <
      1
    ) {
      errors.push(
        'تحقق من تاريخي الرحلة'
      );
    }


    if (
      toNumber(
        $('#adults')?.value
      ) <
      1
    ) {
      errors.push(
        'يجب وجود مسافر بالغ واحد على الأقل'
      );
    }


    state.services
      .filter(
        item =>
          item.category ===
          'hotel'
      )
      .forEach(
        item => {
          const checkIn =
            hotelDateTimestamp(
              item.checkIn
            );


          const checkOut =
            hotelDateTimestamp(
              item.checkOut
            );


          if (
            item.checkIn &&
            checkIn ===
              null
          ) {
            errors.push(
              `تحقق من تاريخ دخول ${item.name}`
            );
          }


          if (
            item.checkOut &&
            checkOut ===
              null
          ) {
            errors.push(
              `تحقق من تاريخ خروج ${item.name}`
            );
          }


          if (
            checkIn !==
              null &&
            checkOut !==
              null &&
            checkOut <
              checkIn
          ) {
            errors.push(
              `تاريخ خروج ${item.name} يسبق تاريخ الدخول`
            );
          }
        }
      );


    const banner =
      $('#validationBanner');


    if (
      showBanner &&
      banner
    ) {
      banner.hidden =
        errors.length ===
        0;


      banner.textContent =
        errors.length
          ? `يرجى التصحيح: ${errors.join('، ')}.`
          : '';
    }


    return errors;
  }


  /* =========================================================
     CLIENT DETAILS
     ========================================================= */

  function detailRows(
  rows
) {
  const visibleRows =
    rows.filter(
      (
        [
          label,
          value
        ]
      ) => {
        if (
          value === null ||
          value === undefined
        ) {
          return false;
        }


        const text =
          String(
            value
          ).trim();


        if (
          !text
        ) {
          return false;
        }


        const hiddenValues =
          [
            'غير محدد',
            'غير محددة',
            'null',
            'undefined',
            'nan'
          ];


        return !hiddenValues.includes(
          text.toLowerCase()
        );
      }
    );


  if (
    !visibleRows.length
  ) {
    return '';
  }


  return `
    <dl class="client-detail-list">

      ${
        visibleRows
          .map(
            (
              [
                label,
                value
              ]
            ) => `
              <div>

                <dt>
                  ${escapeHtml(
                    label
                  )}:
                </dt>

                <dd>
                  ${escapeHtml(
                    value
                  )}
                </dd>

              </div>
            `
          )
          .join('')
      }

    </dl>
  `;
}


  function hotelClientItem(
  item
) {
  const roomType =
    String(
      item?.details ||
      ''
    ).trim();


  const city =
    String(
      item?.city ||
      ''
    ).trim();


  const rawHotelStars =
    String(
      item?.hotelStars ||
      ''
    ).trim();


  const hotelStars =
    rawHotelStars
      ? (
          /نجوم?/i.test(
            rawHotelStars
          )
            ? rawHotelStars
            : `${rawHotelStars} نجوم`
        )
      : '';


  const roomSize =
    String(
      item?.roomSize ||
      ''
    ).trim();


  const board =
    String(
      item?.board ||
      ''
    ).trim();


  const cancellation =
    String(
      item?.cancellation ||
      ''
    ).trim();


  const checkIn =
    String(
      item?.checkIn ||
      ''
    ).trim();


  const checkOut =
    String(
      item?.checkOut ||
      ''
    ).trim();


  const checkInTime =
    String(
      item?.checkInTime ||
      ''
    ).trim();


  const checkOutTime =
    String(
      item?.checkOutTime ||
      ''
    ).trim();


  const qty =
    Number(
      item?.qty
    );


  const rows = [
    [
      'المدينة',
      city
    ],

    [
      'نوع الغرفة',
      roomType
    ],

    [
      'التصنيف',
      hotelStars
    ],

    [
      'المساحة',
      roomSize
    ],

    [
      'الوجبات',
      board
    ],

    [
      'سياسة الإلغاء',
      cancellation
    ],

    [
      'تاريخ الدخول',

      checkIn
        ? clientDateTime(
            formatFlexibleClientDate(
              checkIn
            ),
            checkInTime
          )
        : ''
    ],

    [
      'تاريخ الخروج',

      checkOut
        ? clientDateTime(
            formatFlexibleClientDate(
              checkOut
            ),
            checkOutTime
          )
        : ''
    ],

    [
      'عدد الأشخاص',

      Number.isFinite(
        qty
      ) &&
      qty > 0
        ? englishNumber.format(
            qty
          )
        : ''
    ]
  ]
    .filter(
      (
        [
          label,
          value
        ]
      ) =>
        String(
          value ||
          ''
        ).trim()
    );


  return `
    <div class="included-item hotel-client-item">

      <span class="included-icon">
        ${categories.hotel.icon}
      </span>


      <div>

        <strong>
          ${escapeHtml(
            item?.name ||
            'فندق'
          )}
        </strong>


        ${
          rows.length
            ? detailRows(
                rows
              )
            : ''
        }

      </div>

    </div>
  `;
}


  function flightClientItem(
    item
  ) {
    const legs =
      ensureFlightSegments(
        item
      )
        .map(
          (
            segment,
            index
          ) => `
            <div class="client-flight-leg">

              <strong>
                الرحلة ${index + 1} -
                ${escapeHtml(
                  [
                    segment.from,
                    segment.to
                  ]
                    .filter(Boolean)
                    .join(' ← ') ||
                  'غير محددة'
                )}
              </strong>

              ${
                detailRows([
                  [
                    'تاريخ الإقلاع',

                    clientDateTime(
                      formatFlexibleClientDate(
                        segment.departureDate
                      ),

                      segment.departureTime
                    )
                  ],

                  [
                    'تاريخ الوصول',

                    clientDateTime(
                      formatFlexibleClientDate(
                        segment.arrivalDate
                      ),

                      segment.arrivalTime
                    )
                  ]
                ])
              }

              ${
                segment.extraDetails
                  ? `
                    <small>
                      ${escapeHtml(segment.extraDetails)}
                    </small>
                  `
                  : ''
              }

            </div>
          `
        )
        .join('');


    return `
      <div class="included-item flight-client-item">

        <span class="included-icon">
          ${categories.flight.icon}
        </span>

        <div>

          <strong>
            ${escapeHtml(item.name)}
          </strong>

          <small>
            درجة الطيران:
            ${escapeHtml(item.details || 'غير محددة')}
          </small>

          <div class="client-flight-legs">
            ${legs}
          </div>

        </div>

      </div>
    `;
  }


  function serviceClientItems(
  category,
  flightType = ''
) {
    const items =
  state.services.filter(
    item => {
      if (
        item.category !==
        category
      ) {
        return false;
      }


      if (
        category !==
          'flight' ||
        !flightType
      ) {
        return true;
      }


      const itemFlightType =
        String(
          item?.flightType ||
          ''
        )
          .trim()
          .toLowerCase();


      /*
       * الرحلات القديمة التي لا تحتوي flightType
       * نعتبرها دولية حتى لا تختفي من العرض.
       */
      if (
        flightType ===
          'international'
      ) {
        return (
          !itemFlightType ||
          itemFlightType ===
            'international'
        );
      }


      if (
        flightType ===
          'domestic'
      ) {
        return (
          itemFlightType ===
          'domestic'
        );
      }


      return true;
    }
  );


    if (
      category ===
      'hotel'
    ) {
      return state.hotelCities
        .map(
          city => {
            const hotels =
              items.filter(
                item =>
                  item.city ===
                  city
              );


            return hotels.length
              ? `
                <section class="client-hotel-city">

                  <h3 dir="auto">
                    ${escapeHtml(city)}
                  </h3>

                  <div class="included-grid">

                    ${
                      hotels
                        .map(
                          hotelClientItem
                        )
                        .join('')
                    }

                  </div>

                </section>
              `
              : '';
          }
        )
        .join('');
    }


    if (
      category ===
      'flight'
    ) {
      return items
        .map(
          flightClientItem
        )
        .join('');
    }


    return items
      .map(
        item => `
          <div class="included-item">

            <span class="included-icon">
              ${categories[item.category].icon}
            </span>

            <div>

              <strong>
                ${escapeHtml(item.name)}
              </strong>

              <small>
                ${escapeHtml(item.details || '')}
              </small>

            </div>

          </div>
        `
      )
      .join('');
  }


  /* =========================================================
     CLIENT VIEW
     ========================================================= */
function updateClientSectionNumbers() {
  const sectionIds = [
  'clientFlightsSection',
  'clientDomesticFlightsSection',
  'clientHotelsSection',
  'clientTransfersSection',
  'clientActivitiesSection',
  'clientItinerarySection'
];


  let visibleNumber =
    1;


  sectionIds.forEach(
    id => {
      const section =
        $(`#${id}`);


      if (
        !section
      ) {
        return;
      }


      /*
       * القسم المخفي لا يأخذ رقم.
       */
      if (
        section.hidden ||
        getComputedStyle(
          section
        ).display ===
          'none'
      ) {
        return;
      }


      const numberElement =
        section.querySelector(
          '[data-client-section-number]'
        );


      if (
        !numberElement
      ) {
        return;
      }


      numberElement.textContent =
        String(
          visibleNumber
        ).padStart(
          2,
          '0'
        );


      visibleNumber +=
        1;
    }
  );
}
  function buildClientView() {
    const errors =
      validate(
        true
      );


    if (
      errors.length
    ) {
      toast(
        'تحقق من بيانات العرض أولاً'
      );


      return false;
    }


    ensureStateStructure();


    const result =
      totals();


    const start =
      new Date(
        `${$('#startDate').value}T00:00:00`
      );


    const end =
      new Date(
        `${$('#endDate').value}T00:00:00`
      );


    applyCopy();


    setText(
      '#clientQuoteNumber',
      $('#quoteNumber')
        ?.value
        .trim() ||
      '-'
    );


    setText(
      '#clientNameDisplay',
      $('#clientName')
        ?.value
        .trim() ||
      'ضيفنا الكريم'
    );


    setText(
      '#offerTitle',
      replaceCopyTokens(
        state.copy.clientHeroTitle
      )
    );


    setText(
      '#offerSubtitle',
      replaceCopyTokens(
        state.copy.clientHeroSubtitle
      )
    );


    setText(
      '#offerDates',
      `${formatClientDate(start)} - ${formatClientDate(end)}`
    );


    setText(
      '#offerDuration',
      $('#durationDisplay')
        ?.value ||
      ''
    );


    const adults =
      Math.max(
        0,
        toNumber(
          $('#adults')?.value
        )
      );


    const children =
      Math.max(
        0,
        toNumber(
          $('#children')?.value
        )
      );


    const facts =
      $('#offerFacts');


    if (
      facts
    ) {
      facts.innerHTML =
        [
          [
            'المسافرون',

            `${adults} بالغين${
              children
                ? ` + ${children} أطفال`
                : ''
            }`
          ],

          [
            'تاريخ الوصول',
            formatClientDate(
              start
            )
          ],

          [
            'تاريخ العودة',
            formatClientDate(
              end
            )
          ],

          [
            'المدة',
            `${dayCount()} أيام`
          ]
        ]
          .map(
            (
              [
                label,
                value
              ]
            ) => `
              <div class="offer-fact">

                <span>
                  ${escapeHtml(label)}
                </span>

                <strong>
                  ${escapeHtml(value)}
                </strong>

              </div>
            `
          )
          .join('');
    }


    const sections = [
  [
    'flight',
    'clientFlights',
    'clientFlightsSection',
    'showFlights',
    'international'
  ],

  [
    'flight',
    'clientDomesticFlights',
    'clientDomesticFlightsSection',
    'showFlights',
    'domestic'
  ],

  [
    'hotel',
    'clientHotels',
    'clientHotelsSection',
    'showHotels',
    ''
  ],

  [
    'transfer',
    'clientTransfers',
    'clientTransfersSection',
    'showTransfers',
    ''
  ],

  [
    'activity',
    'clientActivities',
    'clientActivitiesSection',
    'showActivities',
    ''
  ]
];


sections.forEach(
  (
    [
      category,
      contentId,
      sectionId,
      toggleId,
      flightType
    ]
  ) => {
    const html =
      serviceClientItems(
        category,
        flightType
      );


    const content =
      $(`#${contentId}`);


    const section =
      $(`#${sectionId}`);


    const toggle =
      $(`#${toggleId}`);


    if (
      content
    ) {
      content.innerHTML =
        html;
    }


    if (
      section
    ) {
      section.hidden =
        !toggle?.checked ||
        !html;
    }
  }
);


    const itinerary =
      $('#clientItinerary');


    if (
      itinerary
    ) {
      itinerary.innerHTML =
        state.itinerary
          .map(
            (
              day,
              index
            ) => `
              <div class="client-day">

                <span>
                  اليوم ${index + 1}
                </span>

                <strong>
                  ${escapeHtml(day.title)}
                </strong>

                <p>
                  ${escapeHtml(day.details)}
                </p>

              </div>
            `
          )
          .join('');
    }


    if (
      facts
    ) {
      facts.hidden =
        !$('#showFacts')?.checked;
    }


    const itinerarySection =
      $('#clientItinerarySection');


    if (
      itinerarySection
    ) {
      itinerarySection.hidden =
        !$('#showItinerary')?.checked ||
        !state.itinerary.length;
    }
updateClientSectionNumbers();

    const priceSection =
      $('#clientPriceSection');


    if (
      priceSection
    ) {
      priceSection.hidden =
        !$('#showPrices')?.checked;
    }


    const notesSection =
      $('#clientNotesSection');


    if (
      notesSection
    ) {
      notesSection.hidden =
        !$('#showNotes')?.checked;
    }


    setText(
      '#clientGrandTotal',

      result.total >
      0
        ? money.format(
            result.total
          )
        : 'بانتظار التسعير'
    );


    setText(
      '#clientPerTraveler',

      result.total >
      0
        ? `${money.format(result.perTraveler)} تقريباً لكل مسافر`
        : 'بانتظار التسعير'
    );


    setText(
      '#priceTaxNote',

      $('#vatEnabled')?.checked
        ? 'شامل ضريبة القيمة المضافة'
        : 'السعر النهائي للعرض'
    );


    const internal =
      $('#internalView');


    const client =
      $('#clientView');


    if (
      internal
    ) {
      internal.hidden =
        true;
    }


    if (
      client
    ) {
      client.hidden =
        false;
    }


    refreshFloatingEditorActions();


    requestAnimationFrame(
      () => {
        calculateClientBackVisibility();
      }
    );


    window.scrollTo({
      top:
        0,

      behavior:
        'auto'
    });


    return true;
  }


  /* =========================================================
     FLOATING BUTTONS
     ========================================================= */

  let previewClientButtonInView =
    false;


  function refreshFloatingEditorActions() {
    const actions =
      $('#floatingOfferActions');


    const internal =
      $('#internalView');


    if (
      !actions ||
      !internal
    ) {
      return;
    }


    const shouldShow =
      !internal.hidden &&
      !previewClientButtonInView;


    actions.classList.toggle(
      'is-visible',
      shouldShow
    );


    actions.setAttribute(
      'aria-hidden',
      shouldShow
        ? 'false'
        : 'true'
    );


    [
      $('#floatingClientBtn'),
      $('#floatingSummaryBtn')
    ]
      .filter(
        Boolean
      )
      .forEach(
        button => {
          button.tabIndex =
            shouldShow
              ? 0
              : -1;
        }
      );
  }


  function calculatePreviewButtonVisibility() {
    const button =
      $('#previewClientBtn');


    if (
      !button
    ) {
      return;
    }


    const rect =
      button.getBoundingClientRect();


    const topbarHeight =
      $('.topbar')
        ?.getBoundingClientRect()
        .height ||
      0;


    previewClientButtonInView =
      rect.bottom >
        topbarHeight &&
      rect.top <
        window.innerHeight &&
      rect.right >
        0 &&
      rect.left <
        window.innerWidth;


    refreshFloatingEditorActions();
  }


  function scrollToOfferSummary() {
    const summary =
      $('#offerSummaryPanel');


    if (
      !summary
    ) {
      return;
    }


    const topbarHeight =
      $('.topbar')
        ?.getBoundingClientRect()
        .height ||
      0;


    const target =
      window.scrollY +
      summary
        .getBoundingClientRect()
        .top -
      topbarHeight -
      16;


    window.scrollTo({
      top:
        Math.max(
          0,
          target
        ),

      behavior:
        'smooth'
    });
  }


  let topBackButtonInView =
    true;


  function refreshFloatingClientBack() {
    const wrapper =
      $('#floatingClientBackAction');


    const button =
      $('#floatingBackToEditBtn');


    const client =
      $('#clientView');


    if (
      !wrapper ||
      !button ||
      !client
    ) {
      return;
    }


    const shouldShow =
      !client.hidden &&
      !topBackButtonInView;


    wrapper.classList.toggle(
      'is-visible',
      shouldShow
    );


    wrapper.setAttribute(
      'aria-hidden',
      shouldShow
        ? 'false'
        : 'true'
    );


    button.tabIndex =
      shouldShow
        ? 0
        : -1;
  }


  function calculateClientBackVisibility() {
    const topButton =
      $('#backToEditBtn');


    const client =
      $('#clientView');


    if (
      !topButton ||
      !client ||
      client.hidden
    ) {
      topBackButtonInView =
        true;


      refreshFloatingClientBack();


      return;
    }


    const rect =
      topButton.getBoundingClientRect();


    topBackButtonInView =
      rect.bottom >
        0 &&
      rect.top <
        window.innerHeight &&
      rect.right >
        0 &&
      rect.left <
        window.innerWidth;


    refreshFloatingClientBack();
  }


  function backToEditor() {
    const client =
      $('#clientView');


    const internal =
      $('#internalView');


    if (
      client
    ) {
      client.hidden =
        true;
    }


    if (
      internal
    ) {
      internal.hidden =
        false;
    }


    topBackButtonInView =
      true;


    refreshFloatingClientBack();


    window.scrollTo({
      top:
        0,

      behavior:
        'auto'
    });


    requestAnimationFrame(
      calculatePreviewButtonVisibility
    );
  }


  /* =========================================================
     SERVICE DIALOG
     ========================================================= */

  let pendingHotelCity =
    '';


  function updateNewServiceScheduleFields() {
  const categoryElement =
    $('#newServiceCategory');


  if (
    !categoryElement
  ) {
    return;
  }


  const category =
    categoryElement.value;


  const flightDates =
    $('#newFlightDates');


  const hotelDates =
    $('#newHotelDates');


  const flightTypeWrap =
    $('#newFlightTypeWrap');


  const nameInput =
    $('#newServiceName');


  const detailsLabel =
    $('#newServiceDetailsLabel');


  const detailsInput =
    $('#newServiceDetails');


  const qtyLabel =
    $('#newServiceQtyLabel');


  if (
    flightTypeWrap
  ) {
    flightTypeWrap.hidden =
      category !==
      'flight';
  }


  if (
    flightDates
  ) {
    flightDates.hidden =
      category !==
      'flight';
  }


  if (
    hotelDates
  ) {
    hotelDates.hidden =
      category !==
      'hotel';
  }


  if (
    category ===
      'flight'
  ) {
    if (
      detailsLabel
    ) {
      detailsLabel.textContent =
        'درجة الطيران';
    }


    if (
      detailsInput
    ) {
      detailsInput.placeholder =
        'مثال: Economy أو Business';
    }


    if (
      qtyLabel
    ) {
      qtyLabel.textContent =
        'عدد المسافرين';
    }


    updateNewFlightType();


    return;
  }


  if (
    category ===
      'hotel'
  ) {
    if (
      nameInput
    ) {
      nameInput.value =
        '';
    }


    if (
      detailsLabel
    ) {
      detailsLabel.textContent =
        'نوع الغرفة';
    }


    if (
      detailsInput
    ) {
      detailsInput.placeholder =
        'مثال: Deluxe King Room';
    }


    if (
      qtyLabel
    ) {
      qtyLabel.textContent =
        'عدد الأشخاص';
    }


    return;
  }


  if (
    category ===
      'transfer'
  ) {
    if (
      nameInput
    ) {
      nameInput.value =
        'خدمة نقل';
    }


    if (
      detailsLabel
    ) {
      detailsLabel.textContent =
        'وسيلة النقل';
    }


    if (
      detailsInput
    ) {
      detailsInput.placeholder =
        'مثال: سيارة خاصة أو فان أو قارب';
    }


    if (
      qtyLabel
    ) {
      qtyLabel.textContent =
        'عدد المركبات';
    }


    return;
  }


  if (
    category ===
      'airport_service'
  ) {
    if (
      nameInput
    ) {
      nameInput.value =
        'استقبال وتوديع المطار';
    }


    if (
      detailsLabel
    ) {
      detailsLabel.textContent =
        'مسار الاستقبال والتوديع';
    }


    if (
      detailsInput
    ) {
      detailsInput.placeholder =
        'مثال: مطار بالي → فندق أوبود';
    }


    if (
      qtyLabel
    ) {
      qtyLabel.textContent =
        'عدد المركبات';
    }


    return;
  }


  if (
    category ===
      'activity'
  ) {
    if (
      nameInput
    ) {
      nameInput.value =
        '';
    }


    if (
      detailsLabel
    ) {
      detailsLabel.textContent =
        'تفاصيل النشاط';
    }


    if (
      detailsInput
    ) {
      detailsInput.placeholder =
        'مثال: جولة خاصة مع مرشد';
    }


    if (
      qtyLabel
    ) {
      qtyLabel.textContent =
        'عدد الأشخاص';
    }


    return;
  }


  if (
    nameInput
  ) {
    nameInput.value =
      '';
  }


  if (
    detailsLabel
  ) {
    detailsLabel.textContent =
      'التفاصيل';
  }


  if (
    detailsInput
  ) {
    detailsInput.placeholder =
      'اكتب تفاصيل الخدمة';
  }


  if (
    qtyLabel
  ) {
    qtyLabel.textContent =
      'الكمية';
  }
}
function updateNewFlightType() {
  const category =
    $('#newServiceCategory')
      ?.value ||
    '';


  if (
    category !==
      'flight'
  ) {
    return;
  }


  const flightType =
    $('#newFlightType')
      ?.value ||
    'international';


  const nameInput =
    $('#newServiceName');


  if (
    !nameInput
  ) {
    return;
  }


  nameInput.value =
    flightType ===
      'domestic'
      ? 'تذاكر الطيران الداخلي'
      : 'تذاكر الطيران الدولي';
}

  function openServiceDialog(
    category = 'flight',
    city = ''
  ) {
    pendingHotelCity =
      city;


    const categoryElement =
      $('#newServiceCategory');


    const cityElement =
      $('#newHotelCity');


    if (
      categoryElement
    ) {
      categoryElement.value =
        category;
    }


    if (
      cityElement
    ) {
      cityElement.value =
        city;
    }


    updateNewServiceScheduleFields();
if (
  category ===
    'flight'
) {
  updateNewFlightType();
}

    $('#serviceDialog')
      ?.showModal();
  }


  /* =========================================================
     HOTEL DRAG
     ========================================================= */

  let draggedHotel =
    null;


  function clearHotelDropClasses() {
    $$('.hotel-service-row')
      .forEach(
        row => {
          row.classList.remove(
            'hotel-dragging',
            'hotel-drop-target'
          );
        }
      );
  }


  const servicesList =
    $('#servicesList');
    servicesList
  ?.addEventListener(
    'click',

    event => {
      const button =
        event.target.closest(
          '.open-hotel-source-btn'
        );


      if (
        !button
      ) {
        return;
      }


      event.preventDefault();


      const row =
        button.closest(
          '.service-row'
        );


      const input =
        row?.querySelector(
          'input[data-field="sourceUrl"]'
        );


      const rawUrl =
        String(
          input?.value ||
          ''
        ).trim();


      if (
        !rawUrl
      ) {
        toast(
          'لا يوجد رابط للفندق'
        );


        return;
      }


      let url =
        rawUrl;


      if (
        !/^https?:\/\//i.test(
          url
        )
      ) {
        url =
          `https://${url}`;
      }


      try {
        const parsedUrl =
          new URL(
            url
          );


        if (
          ![
            'http:',
            'https:'
          ].includes(
            parsedUrl.protocol
          )
        ) {
          throw new Error(
            'Invalid protocol'
          );
        }


        window.open(
          parsedUrl.href,
          '_blank',
          'noopener,noreferrer'
        );
      } catch (
        error
      ) {
        toast(
          'رابط الفندق غير صالح'
        );
      }
    }
  );
servicesList
  ?.addEventListener(
    'click',

    event => {
      const button =
        event.target.closest(
          '.delete-hotel-city-btn'
        );


      if (
        !button
      ) {
        return;
      }


      event.preventDefault();
event.stopImmediatePropagation();


      const city =
        button.dataset.city;


      deleteHotelCity(
        city
      );
    }
  );

  servicesList
    ?.addEventListener(
      'dragstart',

      event => {
        const handle =
          event.target.closest(
            '.hotel-drag-handle'
          );


        if (
          !handle
        ) {
          return;
        }



if (
  deleteCityButton
) {
  const city =
    String(
      deleteCityButton.dataset.city ||
      ''
    ).trim();


  if (
    !city
  ) {
    return;
  }


  const hotelsInCity =
    state.services.filter(
      item =>
        item.category ===
          'hotel' &&
        item.city ===
          city
    );


  if (
    hotelsInCity.length
  ) {
    const confirmed =
      window.confirm(
        `يوجد ${hotelsInCity.length} فندق في ${city}. هل تريد حذف  data-field="city" وجميع فنادقها؟`
      );


    if (
      !confirmed
    ) {
      return;
    }


    state.services =
      state.services.filter(
        item =>
          !(
            item.category ===
              'hotel' &&
            item.city ===
              city
          )
      );
  }


  state.hotelCities =
    state.hotelCities.filter(
      currentCity =>
        currentCity !==
        city
    );


  renderServices();


  updateSummary();


  scheduleAutoSave();


  toast(
    `تم حذف ${city} من الفنادق`
  );


  return;
}

        const row =
          handle.closest(
            '.hotel-service-row'
          );


        if (
          !row
        ) {
          return;
        }


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item ||
          item.category !==
          'hotel'
        ) {
          return;
        }


        draggedHotel = {
          id:
            item.id,

          city:
            item.city
        };


        row.classList.add(
          'hotel-dragging'
        );


        if (
          event.dataTransfer
        ) {
          event.dataTransfer.effectAllowed =
            'move';


          event.dataTransfer.setData(
            'text/plain',
            item.id
          );
        }
      }
    );


  servicesList
    ?.addEventListener(
      'dragover',

      event => {
        if (
          !draggedHotel
        ) {
          return;
        }


        const targetRow =
          event.target.closest(
            '.hotel-service-row'
          );


        if (
          !targetRow
        ) {
          return;
        }


        const targetItem =
          state.services.find(
            service =>
              service.id ===
              targetRow.dataset.id
          );


        if (
          !targetItem ||
          targetItem.city !==
            draggedHotel.city
        ) {
          return;
        }


        event.preventDefault();


        $$('.hotel-service-row')
          .forEach(
            row => {
              row.classList.remove(
                'hotel-drop-target'
              );
            }
          );


        if (
          targetItem.id !==
          draggedHotel.id
        ) {
          targetRow.classList.add(
            'hotel-drop-target'
          );
        }


        if (
          event.dataTransfer
        ) {
          event.dataTransfer.dropEffect =
            'move';
        }
      }
    );


  servicesList
    ?.addEventListener(
      'drop',

      event => {
        if (
          !draggedHotel
        ) {
          return;
        }


        const targetRow =
          event.target.closest(
            '.hotel-service-row'
          );


        if (
          !targetRow
        ) {
          clearHotelDropClasses();

          draggedHotel =
            null;

          return;
        }


        const targetItem =
          state.services.find(
            service =>
              service.id ===
              targetRow.dataset.id
          );


        const draggedItem =
          state.services.find(
            service =>
              service.id ===
              draggedHotel.id
          );


        if (
          !targetItem ||
          !draggedItem ||
          targetItem.id ===
            draggedItem.id ||
          targetItem.city !==
            draggedItem.city
        ) {
          clearHotelDropClasses();

          draggedHotel =
            null;

          return;
        }


        event.preventDefault();


        const targetRect =
          targetRow
            .getBoundingClientRect();


        const insertAfter =
          event.clientY >
          targetRect.top +
          targetRect.height /
          2;


        const fromIndex =
          state.services
            .findIndex(
              service =>
                service.id ===
                draggedItem.id
            );


        if (
          fromIndex <
          0
        ) {
          return;
        }


        const [
          moved
        ] =
          state.services.splice(
            fromIndex,
            1
          );


        let targetIndex =
          state.services
            .findIndex(
              service =>
                service.id ===
                targetItem.id
            );


        if (
          targetIndex <
          0
        ) {
          state.services.push(
            moved
          );
        } else {
          if (
            insertAfter
          ) {
            targetIndex +=
              1;
          }


          state.services.splice(
            targetIndex,
            0,
            moved
          );
        }


        draggedHotel =
          null;


        clearHotelDropClasses();


        renderServices();


        scheduleAutoSave();


        toast(
          'تم تغيير ترتيب الفندق'
        );
      }
    );


  servicesList
    ?.addEventListener(
      'dragend',

      event => {
        if (
          event.target.closest(
            '.hotel-drag-handle'
          )
        ) {
          draggedHotel =
            null;


          clearHotelDropClasses();
        }
      }
    );


  /* =========================================================
     FLIGHT DRAG
     ========================================================= */

  let draggedFlight =
    null;


  servicesList
    ?.addEventListener(
      'dragstart',

      event => {
        const handle =
          event.target.closest(
            '.segment-drag-handle'
          );


        if (
          !handle
        ) {
          return;
        }


        const row =
          handle.closest(
            '.service-row'
          );


        const segment =
          handle.closest(
            '.flight-segment'
          );


        if (
          !row ||
          !segment
        ) {
          return;
        }


        draggedFlight = {
          serviceId:
            row.dataset.id,

          segmentId:
            segment.dataset.segmentId
        };


        segment.classList.add(
          'dragging'
        );
      }
    );


  servicesList
    ?.addEventListener(
      'dragover',

      event => {
        if (
          draggedFlight &&
          event.target.closest(
            '.flight-segment'
          )
        ) {
          event.preventDefault();
        }
      }
    );


  servicesList
    ?.addEventListener(
      'drop',

      event => {
        if (
          !draggedFlight
        ) {
          return;
        }


        const target =
          event.target.closest(
            '.flight-segment'
          );


        const row =
          event.target.closest(
            '.service-row'
          );


        if (
          !target ||
          !row ||
          row.dataset.id !==
            draggedFlight.serviceId
        ) {
          return;
        }


        event.preventDefault();


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item
        ) {
          return;
        }


        const segments =
          ensureFlightSegments(
            item
          );


        const from =
          segments.findIndex(
            segment =>
              segment.id ===
              draggedFlight.segmentId
          );


        const to =
          segments.findIndex(
            segment =>
              segment.id ===
              target.dataset.segmentId
          );


        if (
          from >=
            0 &&
          to >=
            0 &&
          from !==
            to
        ) {
          const [
            moved
          ] =
            segments.splice(
              from,
              1
            );


          segments.splice(
            to,
            0,
            moved
          );


          renderServices();


          scheduleAutoSave();
        }


        draggedFlight =
          null;
      }
    );


  servicesList
    ?.addEventListener(
      'dragend',

      event => {
        if (
          event.target.closest(
            '.segment-drag-handle'
          )
        ) {
          draggedFlight =
            null;


          $$('.flight-segment')
            .forEach(
              segment => {
                segment.classList.remove(
                  'dragging'
                );
              }
            );
        }
      }
    );


  /* =========================================================
     SERVICE INPUT
     ========================================================= */

  servicesList
    ?.addEventListener(
      'input',

      event => {
        const row =
          event.target.closest(
            '.service-row'
          );


        if (
          !row
        ) {
          return;
        }


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item
        ) {
          return;
        }


        const segmentField =
          event.target.dataset
            .segmentField;


        if (
          segmentField
        ) {
          const segmentElement =
            event.target.closest(
              '.flight-segment'
            );


          const segment =
            ensureFlightSegments(
              item
            ).find(
              entry =>
                entry.id ===
                segmentElement
                  ?.dataset
                  .segmentId
            );


          if (
            !segment
          ) {
            return;
          }


          segment[
            segmentField
          ] =
            segmentField ===
            'price'
              ? Math.max(
                  0,
                  toNumber(
                    event.target.value
                  )
                )
              : event.target.value;


          const lineTotal =
            row.querySelector(
              '.line-total'
            );


          if (
            lineTotal
          ) {
            lineTotal.textContent =
              money.format(
                serviceTotal(
                  item
                )
              );
          }


          updateSummary();


          return;
        }


        const field =
          event.target.dataset.field;


        if (
          !field
        ) {
          return;
        }


        item[
          field
        ] =
          [
            'qty',
            'cost',
            'hotelTax'
          ].includes(
            field
          )
            ? Math.max(
                0,
                toNumber(
                  event.target.value
                )
              )
            : event.target.value;


        const costLabel =
          row.querySelector(
            '.cost-field span'
          );


        if (
          costLabel
        ) {
          costLabel.textContent =
            item.costMode ===
            'unit'
              ? 'تكلفة الوحدة'
              : 'التكلفة الإجمالية';
        }


        const lineTotal =
          row.querySelector(
            '.line-total'
          );


        if (
          lineTotal
        ) {
          lineTotal.textContent =
            money.format(
              serviceTotal(
                item
              )
            );
        }


        updateSummary();
      }
    );


  servicesList
    ?.addEventListener(
      'change',

      event => {
        if (
          event.target.matches(
            '.city-name-input'
          )
        ) {
          const index =
            toNumber(
              event.target.dataset
                .cityIndex,
              -1
            );


          const oldCity =
            state.hotelCities[
              index
            ];


          const newCity =
            event.target.value
              .trim();


          if (
            !oldCity ||
            !newCity
          ) {
            renderServices();

            return;
          }


          if (
            state.hotelCities.includes(
              newCity
            ) &&
            newCity !==
              oldCity
          ) {
            toast(
              'اسم المدينة موجود بالفعل'
            );


            renderServices();


            return;
          }


          state.hotelCities[
            index
          ] =
            newCity;


          state.services
            .filter(
              item =>
                item.category ===
                  'hotel' &&
                item.city ===
                  oldCity
            )
            .forEach(
              item => {
                item.city =
                  newCity;
              }
            );


          renderServices();


          scheduleAutoSave();


          return;
        }


        const row =
          event.target.closest(
            '.service-row'
          );


        if (
          !row
        ) {
          return;
        }


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item
        ) {
          return;
        }


        if (
          event.target.dataset
            .hotelDate
        ) {
          const parsed =
            parseFlexibleDate(
              event.target.value
            );


          event.target.classList.toggle(
            'invalid-datetime',
            !parsed.valid
          );


          if (
            parsed.valid
          ) {
            event.target.value =
              parsed.display;


            item[
              event.target.dataset.field
            ] =
              parsed.display;
          }


          validate(
            false
          );


          return;
        }


        if (
          event.target.dataset
            .hotelTime
        ) {
          const parsed =
            parseFlexibleTime(
              event.target.value
            );


          event.target.classList.toggle(
            'invalid-datetime',
            !parsed.valid
          );


          if (
            parsed.valid
          ) {
            event.target.value =
              parsed.display;


            item[
              event.target.dataset.field
            ] =
              parsed.display;
          }


          return;
        }


        if (
          event.target.dataset
            .field ===
          'city'
        ) {
          const city =
            event.target.value
              .trim() ||
            'غير محددة';


          item.city =
            city;


          if (
            !state.hotelCities.includes(
              city
            )
          ) {
            state.hotelCities.push(
              city
            );
          }


          renderServices();


          scheduleAutoSave();


          return;
        }


        const segmentKind =
          event.target.dataset
            .segmentKind;


        if (
          segmentKind
        ) {
          const segmentElement =
            event.target.closest(
              '.flight-segment'
            );


          const segment =
            ensureFlightSegments(
              item
            ).find(
              entry =>
                entry.id ===
                segmentElement
                  ?.dataset
                  .segmentId
            );


          if (
            !segment
          ) {
            return;
          }


          const parsed =
            segmentKind ===
            'date'
              ? parseFlexibleDate(
                  event.target.value
                )
              : parseFlexibleTime(
                  event.target.value
                );


          event.target.classList.toggle(
            'invalid-datetime',
            !parsed.valid
          );


          if (
            parsed.valid
          ) {
            event.target.value =
              parsed.display;


            segment[
              event.target.dataset
                .segmentField
            ] =
              parsed.display;
          }
        }
      }
    );


  servicesList
  ?.addEventListener(
    'click',

    event => {
      const quickTransferButton =
        event.target.closest(
          '.quick-add-transfer-btn'
        );


      if (
        quickTransferButton
      ) {
        openServiceDialog(
          'transfer'
        );


        return;
      }


      const row =
        event.target.closest(
          '.service-row'
        );


        if (
          row &&
          event.target.closest(
            '.add-flight-segment'
          )
        ) {
          const item =
            state.services.find(
              service =>
                service.id ===
                row.dataset.id
            );


          if (
            !item
          ) {
            return;
          }


          ensureFlightSegments(
            item
          ).push(
            createSegment()
          );


          renderServices();


          scheduleAutoSave();


          return;
        }


        if (
          row &&
          event.target.closest(
            '.remove-flight-segment'
          )
        ) {
          const item =
            state.services.find(
              service =>
                service.id ===
                row.dataset.id
            );


          if (
            !item
          ) {
            return;
          }


          const segmentId =
            event.target
              .closest(
                '.flight-segment'
              )
              ?.dataset
              .segmentId;


          item.segments =
            ensureFlightSegments(
              item
            ).filter(
              segment =>
                segment.id !==
                segmentId
            );


          renderServices();


          updateSummary();


          scheduleAutoSave();


          return;
        }


        if (
          row &&
          event.target.closest(
            '.remove-service'
          )
        ) {
          state.services =
            state.services.filter(
              item =>
                item.id !==
                row.dataset.id
            );


          renderServices();


          updateSummary();


          scheduleAutoSave();


          toast(
            'تم حذف الخدمة'
          );
        }
      }
    );


  /* =========================================================
     ADD CITY
     ========================================================= */

  $('#addCityBtn')
    ?.addEventListener(
      'click',

      () => {
        const input =
          $('#newCityName');


        const city =
          input
            ?.value
            .trim() ||
          '';


        if (
          !city
        ) {
          toast(
            'اكتب اسم المدينة أولاً'
          );


          return;
        }


        if (
          state.hotelCities.includes(
            city
          )
        ) {
          toast(
            'المدينة موجودة بالفعل'
          );


          return;
        }


        state.hotelCities.push(
          city
        );


        input.value =
          '';


        renderServices();


        scheduleAutoSave();
      }
    );


  /* =========================================================
     SERVICE DIALOG EVENTS
     ========================================================= */

  $('#newServiceCategory')
  ?.addEventListener(
    'change',
    () => {
      updateNewServiceScheduleFields();


      if (
        $('#newServiceCategory')
          ?.value ===
          'flight'
      ) {
        updateNewFlightType();
      }
    }
  );


$('#newFlightType')
  ?.addEventListener(
    'change',
    updateNewFlightType
  );


  $('#addServiceBtn')
    ?.addEventListener(
      'click',

      () => {
        openServiceDialog(
          'flight'
        );
      }
    );


  $('#serviceDialog')
    ?.addEventListener(
      'change',

      event => {
        const kind =
          event.target.dataset
            .flexibleKind;


        if (
          !kind
        ) {
          return;
        }


        const parsed =
          kind ===
          'date'
            ? parseFlexibleDate(
                event.target.value
              )
            : parseFlexibleTime(
                event.target.value
              );


        event.target.classList.toggle(
          'invalid-datetime',
          !parsed.valid
        );


        if (
          parsed.valid
        ) {
          event.target.value =
            parsed.display;
        }
      }
    );


  $('#serviceForm')
    ?.addEventListener(
      'submit',

      event => {
        if (
          event.submitter
            ?.value ===
          'cancel'
        ) {
          return;
        }


        event.preventDefault();


        const selectedCategory =
  $('#newServiceCategory')
    ?.value ||
  'transfer';


const category =
  selectedCategory ===
    'airport_service'
    ? 'transfer'
    : selectedCategory;


const item = {
  id:
    `service-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,

    category,

  serviceType:
    selectedCategory ===
      'airport_service'
      ? 'airport_service'
      : '',

  name:
    $('#newServiceName')
      ?.value
      .trim() ||
    '',

  details:
    $('#newServiceDetails')
      ?.value
      .trim() ||
    '',

  costMode:
    $('#newServiceCostMode')
      ?.value ||
    'total',

  qty:
    Math.max(
      1,
      toNumber(
        $('#newServiceQty')?.value,
        1
      )
    ),

  cost:
    Math.max(
      0,
      toNumber(
        $('#newServiceCost')?.value
      )
    ),

  flightType:
    category ===
      'flight'
      ? (
          $('#newFlightType')
            ?.value ===
            'domestic'
            ? 'domestic'
            : 'international'
        )
      : ''
};


if (
  !item.name
) {
          toast(
            'اكتب اسم الخدمة'
          );


          return;
        }


        if (
          category ===
          'hotel'
        ) {
          const checkIn =
            parseFlexibleDate(
              $('#newHotelCheckIn')?.value ||
              ''
            );


          const checkOut =
            parseFlexibleDate(
              $('#newHotelCheckOut')?.value ||
              ''
            );


          const checkInTime =
            parseFlexibleTime(
              $('#newHotelCheckInTime')?.value ||
              ''
            );


          const checkOutTime =
            parseFlexibleTime(
              $('#newHotelCheckOutTime')?.value ||
              ''
            );


          if (
            !checkIn.valid ||
            !checkOut.valid ||
            !checkInTime.valid ||
            !checkOutTime.valid
          ) {
            toast(
              'تحقق من تواريخ وأوقات الفندق'
            );


            return;
          }


          item.city =
            $('#newHotelCity')
              ?.value
              .trim() ||
            pendingHotelCity ||
            'غير محددة';


          item.checkIn =
            checkIn.display;


          item.checkInTime =
            checkInTime.display;


          item.checkOut =
            checkOut.display;


          item.checkOutTime =
            checkOutTime.display;


          item.hotelTax =
            Math.max(
              0,
              toNumber(
                $('#newHotelTax')?.value
              )
            );


          if (
            !state.hotelCities.includes(
              item.city
            )
          ) {
            state.hotelCities.push(
              item.city
            );
          }
        }


        if (
          category ===
          'flight'
        ) {
          const origin =
            $('#origin')
              ?.value
              .trim() ||
            '';


          const destination =
            $('#destination')
              ?.value
              .split(
                /\s+-\s+/
              )[0]
              .trim() ||
            '';


          const outboundDepartureDate =
            parseFlexibleDate(
              $('#newOutboundDepartureDate')?.value ||
              ''
            );


          const outboundDepartureTime =
            parseFlexibleTime(
              $('#newOutboundDepartureTime')?.value ||
              ''
            );


          const outboundArrivalDate =
            parseFlexibleDate(
              $('#newOutboundArrivalDate')?.value ||
              ''
            );


          const outboundArrivalTime =
            parseFlexibleTime(
              $('#newOutboundArrivalTime')?.value ||
              ''
            );


          const returnDepartureDate =
            parseFlexibleDate(
              $('#newReturnDepartureDate')?.value ||
              ''
            );


          const returnDepartureTime =
            parseFlexibleTime(
              $('#newReturnDepartureTime')?.value ||
              ''
            );


          const returnArrivalDate =
            parseFlexibleDate(
              $('#newReturnArrivalDate')?.value ||
              ''
            );


          const returnArrivalTime =
            parseFlexibleTime(
              $('#newReturnArrivalTime')?.value ||
              ''
            );


          item.segments = [
            createSegment(
              origin,
              destination,

              outboundDepartureDate.valid
                ? outboundDepartureDate.display
                : '',

              outboundDepartureTime.valid
                ? outboundDepartureTime.display
                : '',

              outboundArrivalDate.valid
                ? outboundArrivalDate.display
                : '',

              outboundArrivalTime.valid
                ? outboundArrivalTime.display
                : ''
            ),

            createSegment(
              destination,
              origin,

              returnDepartureDate.valid
                ? returnDepartureDate.display
                : '',

              returnDepartureTime.valid
                ? returnDepartureTime.display
                : '',

              returnArrivalDate.valid
                ? returnArrivalDate.display
                : '',

              returnArrivalTime.valid
                ? returnArrivalTime.display
                : ''
            )
          ];
        }


        state.services.push(
          item
        );


        $('#serviceDialog')
          ?.close();


        $('#serviceForm')
          ?.reset();


        if (
          $('#newServiceQty')
        ) {
          $('#newServiceQty').value =
            1;
        }


        if (
          $('#newServiceCost')
        ) {
          $('#newServiceCost').value =
            0;
        }


        pendingHotelCity =
          '';


        updateNewServiceScheduleFields();


        renderServices();


        updateSummary();


        scheduleAutoSave();


        toast(
          'تمت إضافة الخدمة'
        );
      }
    );


  /* =========================================================
     CHILDREN
     ========================================================= */

  $('#childAges')
    ?.addEventListener(
      'input',

      event => {
        if (
          !event.target.matches(
            '.child-age'
          )
        ) {
          return;
        }


        state.childAges[
          Number(
            event.target.dataset.index
          )
        ] =
          Number(
            event.target.value
          );
      }
    );


  /* =========================================================
     ITINERARY EVENTS
     ========================================================= */

  $('#addDayBtn')
    ?.addEventListener(
      'click',

      () => {
        state.itinerary.push({
          title:
            'يوم جديد',

          details:
            'أضف تفاصيل البرنامج.'
        });


        renderItinerary();


        scheduleAutoSave();
      }
    );


  $('#syncDaysBtn')
    ?.addEventListener(
      'click',

      () => {
        const days =
          dayCount();


        if (
          !days
        ) {
          toast(
            'تحقق من تاريخي الرحلة'
          );


          return;
        }


        state.itinerary =
          state.itinerary.slice(
            0,
            days
          );


        while (
          state.itinerary.length <
          days
        ) {
          state.itinerary.push({
            title:
              'يوم جديد',

            details:
              'أضف تفاصيل البرنامج.'
          });
        }


        renderItinerary();


        scheduleAutoSave();


        toast(
          'تمت مزامنة الأيام'
        );
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'input',

      event => {
        const card =
          event.target.closest(
            '.day-card'
          );


        const field =
          event.target.dataset
            .dayField;


        if (
          !card ||
          !field
        ) {
          return;
        }


        state.itinerary[
          Number(
            card.dataset.index
          )
        ][field] =
          event.target.value;
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'click',

      event => {
        const button =
          event.target.closest(
            '.remove-day'
          );


        if (
          !button
        ) {
          return;
        }


        const card =
          button.closest(
            '.day-card'
          );


        if (
          !card
        ) {
          return;
        }


        state.itinerary.splice(
          Number(
            card.dataset.index
          ),
          1
        );


        renderItinerary();


        scheduleAutoSave();
      }
    );


  let draggedDay =
    null;


  $('#itineraryList')
    ?.addEventListener(
      'dragstart',

      event => {
        const card =
          event.target.closest(
            '.day-card'
          );


        if (
          !card
        ) {
          return;
        }


        draggedDay =
          Number(
            card.dataset.index
          );


        card.classList.add(
          'dragging'
        );
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'dragover',

      event => {
        event.preventDefault();
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'drop',

      event => {
        event.preventDefault();


        const card =
          event.target.closest(
            '.day-card'
          );


        if (
          !card ||
          draggedDay ===
            null
        ) {
          return;
        }


        const target =
          Number(
            card.dataset.index
          );


        const [
          moved
        ] =
          state.itinerary.splice(
            draggedDay,
            1
          );


        state.itinerary.splice(
          target,
          0,
          moved
        );


        draggedDay =
          null;


        renderItinerary();


        scheduleAutoSave();
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'dragend',

      () => {
        draggedDay =
          null;


        $$('.day-card')
          .forEach(
            card => {
              card.classList.remove(
                'dragging'
              );
            }
          );
      }
    );


  /* =========================================================
     SETTINGS
     ========================================================= */

  $('#settingsPanel')
    ?.addEventListener(
      'input',

      event => {
        const key =
          event.target.dataset
            .copyKey;


        if (
          key !==
          'brandTagline'
        ) {
          return;
        }


        const userName =
          saveUserName(
            event.target.value
          );


        state.copy.brandTagline =
          userName;


        applyCopy();
      }
    );


  $('#companyLogoInput')
    ?.addEventListener(
      'change',

      event => {
        event.target.value =
          '';


        toast(
          'الشعار ثابت ولا يمكن تغييره'
        );
      }
    );


  $('#removeCompanyLogoBtn')
    ?.addEventListener(
      'click',

      () => {
        toast(
          'الشعار ثابت ولا يمكن تغييره'
        );
      }
    );


  $('#resetCopyBtn')
    ?.addEventListener(
      'click',

      () => {
        applyCopy();


        toast(
          'نصوص النظام ثابتة'
        );
      }
    );


  /* =========================================================
     GENERAL INPUTS
     ========================================================= */

  [
    'origin',
    'destination',
    'hotelStars',
    'startDate',
    'endDate',
    'adults',
    'children',
    'markupType',
    'markupValue',
    'vatEnabled'
  ]
    .forEach(
      id => {
        $(`#${id}`)
          ?.addEventListener(
            'input',

            () => {
              if (
                id ===
                'children'
              ) {
                renderChildAges();
              }


              updateSummary();
            }
          );
      }
    );


  /* =========================================================
     TABS
     ========================================================= */

  $$('.tab')
    .forEach(
      tab => {
        tab.addEventListener(
          'click',

          () => {
            $$('.tab')
              .forEach(
                current => {
                  current.classList.toggle(
                    'active',
                    current ===
                    tab
                  );
                }
              );


            $$('.tab-panel')
              .forEach(
                panel => {
                  panel.classList.toggle(
                    'active',

                    panel.dataset.panel ===
                    tab.dataset.tab
                  );
                }
              );
          }
        );
      }
    );


  /* =========================================================
     CLIENT BUTTONS
     ========================================================= */

  [
    'previewClientBtn',
    'showClientBtn',
    'floatingClientBtn'
  ]
    .forEach(
      id => {
        $(`#${id}`)
          ?.addEventListener(
            'click',
            buildClientView
          );
      }
    );


  $('#floatingSummaryBtn')
    ?.addEventListener(
      'click',
      scrollToOfferSummary
    );


  $('#backToEditBtn')
    ?.addEventListener(
      'click',
      backToEditor
    );


  $('#floatingBackToEditBtn')
    ?.addEventListener(
      'click',
      backToEditor
    );


  /* =========================================================
     STORAGE
     ========================================================= */

  const savedFieldIds = [
    'quoteNumber',
    'clientName',
    'origin',
    'destination',
    'hotelStars',
    'startDate',
    'endDate',
    'adults',
    'children',
    'internalNotes',
    'markupType',
    'markupValue',
    'vatEnabled',
    'showFacts',
    'showFlights',
    'showHotels',
    'showTransfers',
    'showActivities',
    'showItinerary',
    'showPrices',
    'showNotes'
  ];


  let activeOfferId =
    localStorage.getItem(
      ACTIVE_OFFER_KEY
    ) ||
    null;


  let currentOfferTouched =
    false;


  let autoSaveTimer =
    null;


  function createOfferId() {
    if (
      typeof crypto !==
        'undefined' &&
      typeof crypto.randomUUID ===
        'function'
    ) {
      return crypto.randomUUID();
    }


    return (
      `offer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
  }


  function collectFormState() {
    ensureStateStructure();


    const stateSnapshot =
      structuredClone(
        state
      );


    delete stateSnapshot.copy;


    return {
      version:
        8,

      fields:
        Object.fromEntries(
          savedFieldIds.map(
            id => {
              const element =
                $(`#${id}`);


              if (
                !element
              ) {
                return [
                  id,
                  ''
                ];
              }


              return [
                id,

                element.type ===
                'checkbox'
                  ? element.checked
                  : element.value
              ];
            }
          )
        ),

      state:
        stateSnapshot
    };
  }


  function readSavedOffers() {
    try {
      const offers =
        JSON.parse(
          localStorage.getItem(
            OFFERS_STORAGE_KEY
          ) ||
          '[]'
        );


      return Array.isArray(
        offers
      )
        ? offers
        : [];
    } catch {
      return [];
    }
  }


  /* =========================================================
     QUOTE NUMBER SYSTEM
     ========================================================= */

  function formatQuoteNumber(
    value
  ) {
    const number =
      Math.max(
        1,
        Number(value) || 1
      );


    return String(
      number
    ).padStart(
      4,
      '0'
    );
  }


  function getQuoteNumberFromOffer(
    offer
  ) {
    return String(
      offer
        ?.payload
        ?.fields
        ?.quoteNumber ||
      ''
    ).trim();
  }


  function getUsedQuoteNumbers(
    excludeOfferId = null
  ) {
    const used =
      new Set();


    readSavedOffers()
      .forEach(
        offer => {
          if (
            excludeOfferId &&
            offer.id ===
            excludeOfferId
          ) {
            return;
          }


          const quoteNumber =
            getQuoteNumberFromOffer(
              offer
            );


          if (
            !/^\d+$/.test(
              quoteNumber
            )
          ) {
            return;
          }


          used.add(
            Number(
              quoteNumber
            )
          );
        }
      );


    return used;
  }


  function getAvailableQuoteNumber(
    preferredNumber = '0001',
    excludeOfferId = null
  ) {
    const used =
      getUsedQuoteNumbers(
        excludeOfferId
      );


    let candidate =
      Math.max(
        1,
        Number(
          preferredNumber
        ) || 1
      );


    while (
      used.has(
        candidate
      )
    ) {
      candidate +=
        1;
    }


    return formatQuoteNumber(
      candidate
    );
  }


  function getNextQuoteNumber() {
    const used =
      getUsedQuoteNumbers();


    let number =
      1;


    while (
      used.has(
        number
      )
    ) {
      number +=
        1;
    }


    return formatQuoteNumber(
      number
    );
  }


  function ensureUniqueCurrentQuoteNumber() {
    const input =
      $('#quoteNumber');


    if (
      !input
    ) {
      return '';
    }


    const currentValue =
      String(
        input.value ||
        ''
      ).trim();


    if (
      !currentValue
    ) {
      const newNumber =
        getNextQuoteNumber();


      input.value =
        newNumber;


      return newNumber;
    }


    if (
      !/^\d+$/.test(
        currentValue
      )
    ) {
      const newNumber =
        getNextQuoteNumber();


      input.value =
        newNumber;


      return newNumber;
    }


    const uniqueNumber =
      getAvailableQuoteNumber(
        currentValue,
        activeOfferId
      );


    input.value =
      uniqueNumber;


    return uniqueNumber;
  }


  function rebuildOfferTitle(
    offer
  ) {
    const fields =
      offer
        ?.payload
        ?.fields ||
      {};


    const quoteNumber =
      String(
        fields.quoteNumber ||
        ''
      ).trim();


    const clientName =
      String(
        fields.clientName ||
        ''
      ).trim();


    const destination =
      String(
        fields.destination ||
        ''
      ).trim();


    return (
      [
        quoteNumber,
        clientName
      ]
        .filter(
          Boolean
        )
        .join(
          ' - '
        ) ||
      destination ||
      'عرض جديد'
    );
  }


  function renumberOffersSequentially(
    offers
  ) {
    const result =
      structuredClone(
        offers
      );


    const numberedOffers =
      result
        .filter(
          offer => {
            const quoteNumber =
              getQuoteNumberFromOffer(
                offer
              );


            return /^\d+$/.test(
              quoteNumber
            );
          }
        )
        .sort(
          (
            first,
            second
          ) => {
            const firstNumber =
              Number(
                getQuoteNumberFromOffer(
                  first
                )
              );


            const secondNumber =
              Number(
                getQuoteNumberFromOffer(
                  second
                )
              );


            if (
              firstNumber !==
              secondNumber
            ) {
              return (
                firstNumber -
                secondNumber
              );
            }


            return (
              (
                Date.parse(
                  first.createdAt ||
                  ''
                ) ||
                0
              ) -
              (
                Date.parse(
                  second.createdAt ||
                  ''
                ) ||
                0
              )
            );
          }
        );


    const now =
      Date.now();


    numberedOffers.forEach(
      (
        offer,
        index
      ) => {
        const newQuoteNumber =
          formatQuoteNumber(
            index + 1
          );


        const oldQuoteNumber =
          getQuoteNumberFromOffer(
            offer
          );


        if (
          oldQuoteNumber ===
          newQuoteNumber
        ) {
          return;
        }


        if (
          !offer.payload
        ) {
          offer.payload =
            {};
        }


        if (
          !offer.payload.fields
        ) {
          offer.payload.fields =
            {};
        }


        offer
          .payload
          .fields
          .quoteNumber =
            newQuoteNumber;


        offer.title =
          rebuildOfferTitle(
            offer
          );


        offer.updatedAt =
          new Date(
            now +
            index
          ).toISOString();
      }
    );


    return result;
  }


  function sanitizeOffers(
    offers
  ) {
    return structuredClone(
      Array.isArray(
        offers
      )
        ? offers
        : []
    ).map(
      offer => {
        if (
          offer
            ?.payload
            ?.state
        ) {
          delete offer.payload.state.copy;
        }


        return offer;
      }
    );
  }


  function writeSavedOffers(
    offers,
    options = {}
  ) {
    const {
      syncDrive = true
    } =
      options;


    const cleanOffers =
      sanitizeOffers(
        offers
      );


    localStorage.setItem(
      OFFERS_STORAGE_KEY,

      JSON.stringify(
        cleanOffers
      )
    );


    if (
      syncDrive
    ) {
      scheduleDriveSync(
        cleanOffers
      );
    }
  }


  function createOfferRecord(
    id,
    payload,
    existing = null
  ) {
    const now =
      new Date()
        .toISOString();


    const quote =
      String(
        payload.fields
          ?.quoteNumber ||
        ''
      ).trim();


    const client =
      String(
        payload.fields
          ?.clientName ||
        ''
      ).trim();


    const destination =
      String(
        payload.fields
          ?.destination ||
        ''
      ).trim();


    return {
      id,

      title:
        [
          quote,
          client
        ]
          .filter(
            Boolean
          )
          .join(
            ' - '
          ) ||
        destination ||
        'عرض جديد',

      destination,

      createdAt:
        existing
          ?.createdAt ||
        now,

      updatedAt:
        now,

      payload
    };
  }


  function saveDraft(
    silent = false
  ) {
    ensureStateStructure();


    ensureUniqueCurrentQuoteNumber();


    const offers =
      readSavedOffers();


    let existing =
      offers.find(
        offer =>
          offer.id ===
          activeOfferId
      );


    if (
      !existing
    ) {
      activeOfferId =
        createOfferId();


      existing =
        null;
    }


    const payload =
      collectFormState();


    const record =
      createOfferRecord(
        activeOfferId,
        payload,
        existing
      );


    const next =
      offers.filter(
        offer =>
          offer.id !==
          activeOfferId
      );


    next.unshift(
      record
    );


    writeSavedOffers(
      next
    );


    localStorage.setItem(
      ACTIVE_OFFER_KEY,
      activeOfferId
    );


    currentOfferTouched =
      false;


    updateActiveOfferStatus();


    if (
      !silent
    ) {
      toast(
        'تم حفظ العرض'
      );
    }


    return record;
  }


  function applyFormState(
    payload
  ) {
    if (
      !payload?.fields ||
      !payload?.state
    ) {
      return false;
    }


    Object.entries(
      payload.fields
    ).forEach(
      (
        [
          id,
          value
        ]
      ) => {
        const element =
          $(`#${id}`);


        if (
          !element
        ) {
          return;
        }


        if (
          element.type ===
          'checkbox'
        ) {
          element.checked =
            Boolean(
              value
            );
        } else {
          element.value =
            value ??
            '';
        }
      }
    );


    state =
      structuredClone(
        payload.state
      );


    ensureStateStructure();


    renderAll();


    return true;
  }


  function migrateLegacyDraft() {
    if (
      readSavedOffers()
        .length
    ) {
      return;
    }


    const raw =
      localStorage.getItem(
        LEGACY_STORAGE_KEY
      );


    if (
      !raw
    ) {
      return;
    }


    try {
      const payload =
        JSON.parse(
          raw
        );


      if (
        !payload?.fields ||
        !payload?.state
      ) {
        return;
      }


      if (
        payload.state
      ) {
        delete payload.state.copy;
      }


      payload.fields.quoteNumber =
        '0001';


      const id =
        createOfferId();


      writeSavedOffers(
        [
          createOfferRecord(
            id,
            payload
          )
        ],

        {
          syncDrive:
            false
        }
      );


      activeOfferId =
        id;


      localStorage.setItem(
        ACTIVE_OFFER_KEY,
        id
      );


      localStorage.removeItem(
        LEGACY_STORAGE_KEY
      );
    } catch (
      error
    ) {
      console.error(
        '[Legacy migration]',
        error
      );
    }
  }


  function loadDraft() {
    migrateLegacyDraft();


    const offers =
      readSavedOffers();


    if (
      !offers.length
    ) {
      return false;
    }


    const offer =
      offers.find(
        item =>
          item.id ===
          activeOfferId
      ) ||
      offers[0];


    if (
      !offer
    ) {
      return false;
    }


    applyFormState(
      offer.payload
    );


    activeOfferId =
      offer.id;


    localStorage.setItem(
      ACTIVE_OFFER_KEY,
      offer.id
    );


    updateActiveOfferStatus();


    return true;
  }


  function updateActiveOfferStatus() {
    const status =
      $('#activeOfferStatus');


    if (
      !status
    ) {
      return;
    }


    const offer =
      readSavedOffers().find(
        item =>
          item.id ===
          activeOfferId
      );


    if (
      !offer
    ) {
      status.textContent =
        currentOfferTouched
          ? 'عرض جديد - توجد تغييرات غير محفوظة'
          : 'عرض جديد غير محفوظ';


      return;
    }


    status.textContent =
      currentOfferTouched
        ? `${offer.title} - توجد تغييرات غير محفوظة`
        : offer.title;
  }


  function scheduleAutoSave() {
    currentOfferTouched =
      true;


    updateActiveOfferStatus();


    clearTimeout(
      autoSaveTimer
    );


    autoSaveTimer =
      setTimeout(
        () => {
          try {
            saveDraft(
              true
            );
          } catch (
            error
          ) {
            console.error(
              '[Autosave]',
              error
            );
          }
        },
        650
      );
  }


  function renderSavedOffers(
    search = ''
  ) {
    const value =
      String(
        search
      )
        .trim()
        .toLowerCase();


    const offers =
      readSavedOffers()
        .filter(
          offer =>
            !value ||
            `${offer.title} ${offer.destination}`
              .toLowerCase()
              .includes(
                value
              )
        );


    setText(
      '#savedOffersCount',
      `${offers.length} عروض`
    );


    const list =
      $('#savedOffersList');


    if (
      !list
    ) {
      return;
    }


    list.innerHTML =
      offers.length
        ? offers
            .map(
              offer => `
                <article
                  class="saved-offer-card ${
                    offer.id ===
                    activeOfferId
                      ? 'active'
                      : ''
                  }"
                  data-offer-id="${escapeHtml(offer.id)}"
                >

                  <div class="saved-offer-main">

                    <strong>
                      ${escapeHtml(offer.title)}
                    </strong>

                    <p>
                      ${escapeHtml(offer.destination || '')}
                    </p>

                    <div class="saved-offer-meta">

                      <span>
                        ${
                          new Date(
                            offer.updatedAt
                          ).toLocaleString(
                            'ar-SA'
                          )
                        }
                      </span>

                    </div>

                  </div>

                  <div class="saved-offer-actions">

                    <button
                      class="saved-offer-open"
                      data-offer-action="open"
                      type="button"
                    >
                      فتح
                    </button>

                    <button
                      class="saved-offer-copy"
                      data-offer-action="duplicate"
                      type="button"
                    >
                      نسخ
                    </button>

                    <button
                      class="saved-offer-delete"
                      data-offer-action="delete"
                      type="button"
                    >
                      حذف
                    </button>

                  </div>

                </article>
              `
            )
            .join('')
        : `
          <div class="saved-offers-empty">

            <strong>
              لا توجد عروض
            </strong>

          </div>
        `;
  }


  function loadOfferById(
    id
  ) {
    if (
      activeOfferId &&
      activeOfferId !==
        id &&
      currentOfferTouched
    ) {
      saveDraft(
        true
      );
    }


    const offer =
      readSavedOffers().find(
        item =>
          item.id ===
          id
      );


    if (
      !offer
    ) {
      toast(
        'تعذر العثور على العرض'
      );


      return;
    }


    applyFormState(
      offer.payload
    );


    activeOfferId =
      id;


    currentOfferTouched =
      false;


    localStorage.setItem(
      ACTIVE_OFFER_KEY,
      id
    );


    $('#savedOffersDialog')
      ?.close();


    updateActiveOfferStatus();


    toast(
      'تم فتح العرض'
    );
  }


  function duplicateOffer(
    id
  ) {
    const offers =
      readSavedOffers();


    const source =
      offers.find(
        offer =>
          offer.id ===
          id
      );


    if (
      !source
    ) {
      return;
    }


    const payload =
      structuredClone(
        source.payload
      );


    if (
      payload.state
    ) {
      delete payload.state.copy;
    }


    if (
      !payload.fields
    ) {
      payload.fields =
        {};
    }


    payload.fields.quoteNumber =
      getNextQuoteNumber();


    const newId =
      createOfferId();


    const record =
      createOfferRecord(
        newId,
        payload
      );


    offers.unshift(
      record
    );


    writeSavedOffers(
      offers
    );


    loadOfferById(
      newId
    );


    toast(
      'تم نسخ العرض'
    );
  }


  function deleteOffer(
    id
  ) {
    const offers =
      readSavedOffers();


    const offer =
      offers.find(
        item =>
          item.id ===
          id
      );


    if (
      !offer
    ) {
      return;
    }


    const quoteNumber =
      getQuoteNumberFromOffer(
        offer
      );


    const confirmed =
      window.confirm(
        quoteNumber
          ? `هل تريد حذف العرض رقم ${quoteNumber}؟`
          : `هل تريد حذف "${offer.title}"؟`
      );


    if (
      !confirmed
    ) {
      return;
    }


    const remainingOffers =
      offers.filter(
        item =>
          item.id !==
          id
      );


    const renumberedOffers =
      renumberOffersSequentially(
        remainingOffers
      );


    writeSavedOffers(
      renumberedOffers
    );


    if (
      activeOfferId ===
      id
    ) {
      activeOfferId =
        null;


      currentOfferTouched =
        false;


      localStorage.removeItem(
        ACTIVE_OFFER_KEY
      );


      startNewOffer(
        false
      );
    } else {
      const activeOffer =
        renumberedOffers.find(
          item =>
            item.id ===
            activeOfferId
        );


      if (
        activeOffer
      ) {
        const activeQuoteNumber =
          getQuoteNumberFromOffer(
            activeOffer
          );


        if (
          $('#quoteNumber')
        ) {
          $('#quoteNumber').value =
            activeQuoteNumber;
        }


        updateActiveOfferStatus();
      }
    }


    renderSavedOffers(
      $('#savedOffersSearch')?.value ||
      ''
    );


    toast(
      'تم حذف العرض وإعادة ترتيب الأرقام'
    );
  }


  function startNewOffer(
    saveCurrent = true
  ) {
    if (
      saveCurrent &&
      (
        activeOfferId ||
        currentOfferTouched
      )
    ) {
      saveDraft(
        true
      );
    }


    state = {
  services:
    [],

  itinerary:
    [],

  childAges:
    [],

  tripStops:
    [],

  hotelCities:
    [],

      copy: {
        ...structuredClone(
          defaultCopy
        ),

        brandTagline:
          getUserName()
      }
    };


    activeOfferId =
      null;


    currentOfferTouched =
      false;


    localStorage.removeItem(
      ACTIVE_OFFER_KEY
    );


    const values = {
      quoteNumber:
        getNextQuoteNumber(),

      clientName:
        '',

      origin:
        '',

      destination:
        '',

      hotelStars:
        '4-5',

      startDate:
        '',

      endDate:
        '',

      adults:
        '2',

      children:
        '0',

      internalNotes:
        '',

      markupType:
        'percent',

      markupValue:
        '18'
    };


    Object.entries(
      values
    ).forEach(
      (
        [
          id,
          value
        ]
      ) => {
        const element =
          $(`#${id}`);


        if (
          element
        ) {
          element.value =
            value;
        }
      }
    );


    if (
      $('#vatEnabled')
    ) {
      $('#vatEnabled').checked =
        false;
    }


    [
      'showFacts',
      'showFlights',
      'showHotels',
      'showTransfers',
      'showPrices',
      'showNotes'
    ]
      .forEach(
        id => {
          if (
            $(`#${id}`)
          ) {
            $(`#${id}`).checked =
              true;
          }
        }
      );


    [
      'showActivities',
      'showItinerary'
    ]
      .forEach(
        id => {
          if (
            $(`#${id}`)
          ) {
            $(`#${id}`).checked =
              false;
          }
        }
      );


    if (
      $('#clientView')
    ) {
      $('#clientView').hidden =
        true;
    }


    if (
      $('#internalView')
    ) {
      $('#internalView').hidden =
        false;
    }


    renderAll();


    updateActiveOfferStatus();


    $('#savedOffersDialog')
      ?.close();


    window.scrollTo({
      top:
        0,

      behavior:
        'auto'
    });


    toast(
      'تم إنشاء عرض جديد'
    );
  }


  /* =========================================================
     GOOGLE DRIVE STATUS
     ========================================================= */

  function googleTokenIsValid() {
    return Boolean(
      googleAccessToken &&
      Date.now() <
        googleTokenExpiresAt -
        30000
    );
  }


  function setDriveStatus(
    status,
    text = ''
  ) {
    const element =
      $('#driveStatus');


    const textElement =
      $('#driveStatusText');


    const connectButton =
      $('#connectGoogleDriveBtn');


    const disconnectButton =
      $('#disconnectGoogleDriveBtn');


    if (
      element
    ) {
      element.classList.remove(
        'is-connected',
        'is-syncing',
        'is-error'
      );


      if (
        status ===
        'connected'
      ) {
        element.classList.add(
          'is-connected'
        );
      }


      if (
        status ===
        'syncing'
      ) {
        element.classList.add(
          'is-syncing'
        );
      }


      if (
        status ===
        'error'
      ) {
        element.classList.add(
          'is-error'
        );
      }
    }


    if (
      textElement
    ) {
      const defaults = {
        connected:
          'Google Drive متصل',

        syncing:
          'جاري المزامنة...',

        error:
          'تعذر الاتصال بـ Drive',

        disconnected:
          'Google Drive غير متصل'
      };


      textElement.textContent =
        text ||
        defaults[
          status
        ] ||
        defaults.disconnected;
    }


    if (
      connectButton
    ) {
      connectButton.hidden =
        status ===
        'connected';
    }


    if (
      disconnectButton
    ) {
      disconnectButton.hidden =
        status !==
        'connected';
    }
  }


  function waitForGoogleIdentity(
    timeout = 12000
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const started =
          Date.now();


        function check() {
          if (
            window.google
              ?.accounts
              ?.oauth2
          ) {
            resolve(
              window.google
            );


            return;
          }


          if (
            Date.now() -
            started >=
            timeout
          ) {
            reject(
              new Error(
                'تعذر تحميل Google Identity Services'
              )
            );


            return;
          }


          setTimeout(
            check,
            100
          );
        }


        check();
      }
    );
  }


  function initGoogleDrive() {
    if (
      googleDriveInitPromise
    ) {
      return googleDriveInitPromise;
    }


    googleDriveInitPromise =
      (
        async () => {
          await waitForGoogleIdentity();


          googleTokenClient =
            google.accounts.oauth2
              .initTokenClient({
                client_id:
                  GOOGLE_CLIENT_ID,

                scope:
                  GOOGLE_DRIVE_SCOPE,

                callback:
                  async response => {
                    if (
                      response.error
                    ) {
                      console.error(
                        '[Google OAuth]',
                        response
                      );


                      setDriveStatus(
                        'error',
                        'تعذر تسجيل الدخول'
                      );


                      if (
                        googleAuthRequest
                      ) {
                        googleAuthRequest.reject(
                          new Error(
                            response.error_description ||
                            response.error
                          )
                        );


                        googleAuthRequest =
                          null;
                      }


                      return;
                    }


                    googleAccessToken =
                      response.access_token;


                    const expiresIn =
                      Math.max(
                        60,

                        Number(
                          response.expires_in
                        ) ||
                        3600
                      );


                    googleTokenExpiresAt =
                      Date.now() +
                      expiresIn *
                      1000;


                    localStorage.setItem(
                      GOOGLE_DRIVE_CONSENT_KEY,
                      '1'
                    );


                    setDriveStatus(
                      'connected'
                    );


                    try {
                      await syncOffersFromGoogleDrive();


                      if (
                        googleAuthRequest
                      ) {
                        googleAuthRequest.resolve(
                          true
                        );
                      }
                    } catch (
                      error
                    ) {
                      console.error(
                        '[Drive initial sync]',
                        error
                      );


                      if (
                        googleAuthRequest
                      ) {
                        googleAuthRequest.reject(
                          error
                        );
                      }
                    } finally {
                      googleAuthRequest =
                        null;
                    }
                  },

                error_callback:
                  error => {
                    console.error(
                      '[Google OAuth popup]',
                      error
                    );


                    const message =
                      error.type ===
                      'popup_closed'
                        ? 'تم إغلاق نافذة Google'
                        : 'تعذر فتح تسجيل الدخول';


                    setDriveStatus(
                      'error',
                      message
                    );


                    if (
                      googleAuthRequest
                    ) {
                      googleAuthRequest.reject(
                        new Error(
                          message
                        )
                      );


                      googleAuthRequest =
                        null;
                    }
                  }
              });


          return googleTokenClient;
        }
      )();


    return googleDriveInitPromise;
  }


  async function connectGoogleDrive() {
    if (
      googleTokenIsValid()
    ) {
      setDriveStatus(
        'connected'
      );


      await syncOffersFromGoogleDrive();


      return true;
    }


    await initGoogleDrive();


    if (
      !googleTokenClient
    ) {
      throw new Error(
        'Google OAuth غير جاهز'
      );
    }


    setDriveStatus(
      'syncing',
      'جاري تسجيل الدخول...'
    );


    const consentPreviouslyGranted =
      localStorage.getItem(
        GOOGLE_DRIVE_CONSENT_KEY
      ) ===
      '1';


    return new Promise(
      (
        resolve,
        reject
      ) => {
        googleAuthRequest = {
          resolve,
          reject
        };


        googleTokenClient
          .requestAccessToken({
            prompt:
              consentPreviouslyGranted
                ? ''
                : 'consent'
          });
      }
    );
  }


  function disconnectGoogleDrive() {
    googleAccessToken =
      null;


    googleTokenExpiresAt =
      0;


    driveFolderId =
      null;


    driveOffersFileId =
      null;


    pendingDriveOffers =
      null;


    clearTimeout(
      driveSyncTimer
    );


    setDriveStatus(
      'disconnected'
    );


    toast(
      'تم قطع الاتصال بـ Google Drive'
    );
  }


  /* =========================================================
     DRIVE API
     ========================================================= */

  async function driveFetch(
    url,
    options = {}
  ) {
    if (
      !googleTokenIsValid()
    ) {
      googleAccessToken =
        null;


      googleTokenExpiresAt =
        0;


      setDriveStatus(
        'disconnected'
      );


      throw new Error(
        'انتهت جلسة Google Drive. اضغط ربط Google Drive مرة أخرى.'
      );
    }


    const headers =
      new Headers(
        options.headers ||
        {}
      );


    headers.set(
      'Authorization',
      `Bearer ${googleAccessToken}`
    );


    const response =
      await fetch(
        url,
        {
          ...options,
          headers
        }
      );


    if (
      response.status ===
      401
    ) {
      googleAccessToken =
        null;


      googleTokenExpiresAt =
        0;


      driveFolderId =
        null;


      driveOffersFileId =
        null;


      setDriveStatus(
        'disconnected'
      );


      throw new Error(
        'انتهت جلسة Google Drive. أعد الاتصال.'
      );
    }


    if (
      !response.ok
    ) {
      let details =
        '';


      try {
        const data =
          await response.json();


        details =
          data.error
            ?.message ||
          '';
      } catch {
        try {
          details =
            await response.text();
        } catch {
          details =
            '';
        }
      }


      throw new Error(
        details ||
        `Google Drive Error ${response.status}`
      );
    }


    return response;
  }


  async function driveListFiles(
    query
  ) {
    const params =
      new URLSearchParams({
        q:
          query,

        spaces:
          'drive',

        pageSize:
          '100',

        fields:
          'files(id,name,mimeType,modifiedTime,parents,appProperties)'
      });


    const response =
      await driveFetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`
      );


    const data =
      await response.json();


    return Array.isArray(
      data.files
    )
      ? data.files
      : [];
  }


  async function getDriveFolder() {
    if (
      driveFolderId
    ) {
      return driveFolderId;
    }


    const query = [
      "trashed = false",

      "mimeType = 'application/vnd.google-apps.folder'",

      `appProperties has { key='${DRIVE_APP_KEY}' and value='${DRIVE_APP_VALUE}' }`,

      `appProperties has { key='kind' and value='${DRIVE_FOLDER_KIND}' }`
    ].join(
      ' and '
    );


    const existing =
      await driveListFiles(
        query
      );


    if (
      existing.length
    ) {
      driveFolderId =
        existing[0].id;


      return driveFolderId;
    }


    const response =
      await driveFetch(
        'https://www.googleapis.com/drive/v3/files?fields=id,name',

        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json; charset=UTF-8'
          },

          body:
            JSON.stringify({
              name:
                DRIVE_FOLDER_NAME,

              mimeType:
                'application/vnd.google-apps.folder',

              appProperties: {
                [DRIVE_APP_KEY]:
                  DRIVE_APP_VALUE,

                kind:
                  DRIVE_FOLDER_KIND
              }
            })
        }
      );


    const folder =
      await response.json();


    driveFolderId =
      folder.id;


    return driveFolderId;
  }


  async function findDriveOffersFile() {
    if (
      driveOffersFileId
    ) {
      return driveOffersFileId;
    }


    const folderId =
      await getDriveFolder();


    const query = [
      "trashed = false",

      `'${folderId}' in parents`,

      `appProperties has { key='${DRIVE_APP_KEY}' and value='${DRIVE_APP_VALUE}' }`,

      `appProperties has { key='kind' and value='${DRIVE_OFFERS_KIND}' }`
    ].join(
      ' and '
    );


    const files =
      await driveListFiles(
        query
      );


    if (
      files.length
    ) {
      driveOffersFileId =
        files[0].id;


      return driveOffersFileId;
    }


    return null;
  }


  function sanitizeOffersForCloud(
    offers
  ) {
    return sanitizeOffers(
      offers
    );
  }


  async function createDriveOffersFile(
    offers
  ) {
    const folderId =
      await getDriveFolder();


    const boundary =
      `konooz_${Date.now()}_${Math.random().toString(36).slice(2)}`;


    const metadata = {
      name:
        DRIVE_OFFERS_FILE_NAME,

      mimeType:
        'application/json',

      parents: [
        folderId
      ],

      appProperties: {
        [DRIVE_APP_KEY]:
          DRIVE_APP_VALUE,

        kind:
          DRIVE_OFFERS_KIND
      }
    };


    const cleanOffers =
      sanitizeOffersForCloud(
        offers
      );


    const content =
      JSON.stringify(
        {
          version:
            3,

          updatedAt:
            new Date()
              .toISOString(),

          offers:
            cleanOffers
        },
        null,
        2
      );


    const body =
      new Blob(
        [
          `--${boundary}\r\n`,

          'Content-Type: application/json; charset=UTF-8\r\n\r\n',

          JSON.stringify(
            metadata
          ),

          `\r\n--${boundary}\r\n`,

          'Content-Type: application/json; charset=UTF-8\r\n\r\n',

          content,

          `\r\n--${boundary}--`
        ],

        {
          type:
            `multipart/related; boundary=${boundary}`
        }
      );


    const response =
      await driveFetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',

        {
          method:
            'POST',

          headers: {
            'Content-Type':
              `multipart/related; boundary=${boundary}`
          },

          body
        }
      );


    const file =
      await response.json();


    driveOffersFileId =
      file.id;


    return file.id;
  }


  async function readOffersFromDrive() {
    const fileId =
      await findDriveOffersFile();


    if (
      !fileId
    ) {
      return null;
    }


    const response =
      await driveFetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
      );


    const text =
      await response.text();


    if (
      !text.trim()
    ) {
      return [];
    }


    let parsed;


    try {
      parsed =
        JSON.parse(
          text
        );
    } catch (
      error
    ) {
      console.error(
        '[Drive JSON]',
        error
      );


      throw new Error(
        'ملف العروض في Google Drive غير صالح'
      );
    }


    const offers =
      Array.isArray(
        parsed
      )
        ? parsed
        : (
            Array.isArray(
              parsed.offers
            )
              ? parsed.offers
              : []
          );


    return sanitizeOffers(
      offers
    );
  }


  async function writeOffersToDrive(
    offers
  ) {
    let fileId =
      await findDriveOffersFile();


    if (
      !fileId
    ) {
      return createDriveOffersFile(
        offers
      );
    }


    const cleanOffers =
      sanitizeOffersForCloud(
        offers
      );


    const payload =
      JSON.stringify(
        {
          version:
            3,

          updatedAt:
            new Date()
              .toISOString(),

          offers:
            cleanOffers
        },
        null,
        2
      );


    await driveFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,

      {
        method:
          'PATCH',

        headers: {
          'Content-Type':
            'application/json; charset=UTF-8'
        },

        body:
          payload
      }
    );


    return fileId;
  }


  function mergeOfferCollections(
    localOffers,
    remoteOffers
  ) {
    const merged =
      new Map();


    [
      ...remoteOffers,
      ...localOffers
    ]
      .forEach(
        offer => {
          if (
            !offer?.id
          ) {
            return;
          }


          if (
            offer.payload
              ?.state
          ) {
            delete offer.payload.state.copy;
          }


          const existing =
            merged.get(
              offer.id
            );


          if (
            !existing
          ) {
            merged.set(
              offer.id,
              offer
            );


            return;
          }


          const existingTime =
            Date.parse(
              existing.updatedAt ||
              existing.createdAt ||
              ''
            ) ||
            0;


          const incomingTime =
            Date.parse(
              offer.updatedAt ||
              offer.createdAt ||
              ''
            ) ||
            0;


          if (
            incomingTime >=
            existingTime
          ) {
            merged.set(
              offer.id,
              offer
            );
          }
        }
      );


    return [
      ...merged.values()
    ].sort(
      (
        a,
        b
      ) =>
        (
          Date.parse(
            b.updatedAt ||
            b.createdAt ||
            ''
          ) ||
          0
        ) -
        (
          Date.parse(
            a.updatedAt ||
            a.createdAt ||
            ''
          ) ||
          0
        )
    );
  }


  async function syncOffersFromGoogleDrive() {
    if (
      !googleTokenIsValid()
    ) {
      return false;
    }


    setDriveStatus(
      'syncing',
      'جاري تحميل العروض...'
    );


    try {
      const localOffers =
        readSavedOffers();


      const remoteOffers =
        await readOffersFromDrive();


      if (
        remoteOffers ===
        null
      ) {
        const normalized =
          renumberOffersSequentially(
            localOffers
          );


        writeSavedOffers(
          normalized,
          {
            syncDrive:
              false
          }
        );


        await createDriveOffersFile(
          normalized
        );


        setDriveStatus(
          'connected',
          'Google Drive متصل'
        );


        toast(
          'تم رفع العروض إلى Google Drive'
        );


        return true;
      }


      const merged =
        mergeOfferCollections(
          localOffers,
          remoteOffers
        );


      /*
       * بعد الدمج نحل أي تكرار أو فراغ
       * في أرقام العروض.
       */
      const normalized =
        renumberOffersSequentially(
          merged
        );


      writeSavedOffers(
        normalized,
        {
          syncDrive:
            false
        }
      );


      await writeOffersToDrive(
        normalized
      );


      if (
        $('#savedOffersDialog')
          ?.open
      ) {
        renderSavedOffers(
          $('#savedOffersSearch')?.value ||
          ''
        );
      }


      const active =
        normalized.find(
          offer =>
            offer.id ===
            activeOfferId
        );


      if (
        active &&
        !currentOfferTouched
      ) {
        applyFormState(
          active.payload
        );
      }


      setDriveStatus(
        'connected',
        'Google Drive متصل'
      );


      return true;
    } catch (
      error
    ) {
      console.error(
        '[Drive sync]',
        error
      );


      setDriveStatus(
        'error',
        'فشلت المزامنة'
      );


      throw error;
    }
  }


  function scheduleDriveSync(
    offers
  ) {
    if (
      !googleTokenIsValid()
    ) {
      return;
    }


    pendingDriveOffers =
      sanitizeOffersForCloud(
        offers
      );


    clearTimeout(
      driveSyncTimer
    );


    driveSyncTimer =
      setTimeout(
        () => {
          flushDriveSync()
            .catch(
              error => {
                console.error(
                  '[Drive autosave]',
                  error
                );
              }
            );
        },
        1500
      );
  }


  async function flushDriveSync() {
    if (
      !googleTokenIsValid()
    ) {
      return false;
    }


    if (
      driveSyncRunning
    ) {
      return false;
    }


    if (
      !pendingDriveOffers
    ) {
      return true;
    }


    driveSyncRunning =
      true;


    clearTimeout(
      driveSyncTimer
    );


    try {
      while (
        pendingDriveOffers
      ) {
        const offers =
          pendingDriveOffers;


        pendingDriveOffers =
          null;


        setDriveStatus(
          'syncing',
          'جاري الحفظ...'
        );


        await writeOffersToDrive(
          offers
        );
      }


      setDriveStatus(
        'connected',
        'تم الحفظ على Google Drive'
      );


      return true;
    } catch (
      error
    ) {
      console.error(
        '[Drive save]',
        error
      );


      setDriveStatus(
        'error',
        'تعذر الحفظ على Drive'
      );


      throw error;
    } finally {
      driveSyncRunning =
        false;
    }
  }


  async function saveCurrentOffersToDriveNow() {
    if (
      !googleTokenIsValid()
    ) {
      return false;
    }


    pendingDriveOffers =
      sanitizeOffersForCloud(
        readSavedOffers()
      );


    return flushDriveSync();
  }


  /* =========================================================
     SAVE BUTTONS
     ========================================================= */

  $('#saveDraftBtn')
    ?.addEventListener(
      'click',

      async event => {
        const button =
          event.currentTarget;


        const oldText =
          button.textContent;


        button.disabled =
          true;


        button.textContent =
          'جاري الحفظ...';


        try {
          saveDraft(
            true
          );


          if (
            googleTokenIsValid()
          ) {
            await saveCurrentOffersToDriveNow();


            toast(
              'تم حفظ العرض على Google Drive'
            );
          } else {
            toast(
              'تم حفظ العرض على الجهاز'
            );
          }
        } catch (
          error
        ) {
          console.error(
            '[Save offer]',
            error
          );


          toast(
            'تم الحفظ محلياً، لكن تعذرت مزامنة Google Drive'
          );
        } finally {
          button.disabled =
            false;


          button.textContent =
            oldText;
        }
      }
    );


  $('#savedOffersBtn')
    ?.addEventListener(
      'click',

      async () => {
        if (
          currentOfferTouched ||
          activeOfferId
        ) {
          saveDraft(
            true
          );
        }


        if (
          googleTokenIsValid()
        ) {
          try {
            await syncOffersFromGoogleDrive();
          } catch (
            error
          ) {
            console.error(
              '[Saved offers sync]',
              error
            );
          }
        }


        if (
          $('#savedOffersSearch')
        ) {
          $('#savedOffersSearch').value =
            '';
        }


        renderSavedOffers();


        $('#savedOffersDialog')
          ?.showModal();
      }
    );


  $('#newOfferBtn')
    ?.addEventListener(
      'click',

      () => {
        startNewOffer();
      }
    );


  $('#newOfferFromDialogBtn')
    ?.addEventListener(
      'click',

      () => {
        startNewOffer();
      }
    );


  $('#closeSavedOffersBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#savedOffersDialog')
          ?.close();
      }
    );


  $('#closeSavedOffersBottomBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#savedOffersDialog')
          ?.close();
      }
    );


  $('#savedOffersSearch')
    ?.addEventListener(
      'input',

      event => {
        renderSavedOffers(
          event.target.value
        );
      }
    );


  $('#savedOffersList')
    ?.addEventListener(
      'click',

      event => {
        const button =
          event.target.closest(
            '[data-offer-action]'
          );


        if (
          !button
        ) {
          return;
        }


        const card =
          button.closest(
            '[data-offer-id]'
          );


        if (
          !card
        ) {
          return;
        }


        const id =
          card.dataset.offerId;


        if (
          button.dataset.offerAction ===
          'open'
        ) {
          loadOfferById(
            id
          );
        }


        if (
          button.dataset.offerAction ===
          'duplicate'
        ) {
          duplicateOffer(
            id
          );
        }


        if (
          button.dataset.offerAction ===
          'delete'
        ) {
          deleteOffer(
            id
          );
        }
      }
    );


  /* =========================================================
     GOOGLE BUTTONS
     ========================================================= */

  $('#connectGoogleDriveBtn')
    ?.addEventListener(
      'click',

      async event => {
        const button =
          event.currentTarget;


        const originalText =
          button.textContent;


        button.disabled =
          true;


        button.textContent =
          'جاري الاتصال...';


        try {
          await connectGoogleDrive();


          toast(
            'تم ربط Google Drive بنجاح'
          );
        } catch (
          error
        ) {
          console.error(
            '[Google Drive connect]',
            error
          );


          toast(
            error.message ||
            'تعذر ربط Google Drive'
          );
        } finally {
          button.disabled =
            false;


          button.textContent =
            originalText;
        }
      }
    );


  $('#disconnectGoogleDriveBtn')
    ?.addEventListener(
      'click',

      () => {
        disconnectGoogleDrive();
      }
    );


  /* =========================================================
     SAMPLE RESET
     ========================================================= */

  $('#resetSampleBtn')
    ?.addEventListener(
      'click',

      () => {
        if (
          activeOfferId ||
          currentOfferTouched
        ) {
          saveDraft(
            true
          );
        }


        activeOfferId =
          null;


        localStorage.removeItem(
          ACTIVE_OFFER_KEY
        );


        state = {
          services:
            structuredClone(
              sample.services
            ),

          itinerary:
            [],

          childAges:
            [],

          hotelCities:
            structuredClone(
              sample.hotelCities
            ),

          copy: {
            ...structuredClone(
              defaultCopy
            ),

            brandTagline:
              getUserName()
          }
        };


        if (
          $('#quoteNumber')
        ) {
          $('#quoteNumber').value =
            getNextQuoteNumber();
        }


        if (
          $('#clientName')
        ) {
          $('#clientName').value =
            'ضيفنا الكريم';
        }


        if (
          $('#origin')
        ) {
          $('#origin').value =
            'جدة';
        }


        if (
          $('#destination')
        ) {
          $('#destination').value =
            'ماليزيا';
        }


        if (
          $('#startDate')
        ) {
          $('#startDate').value =
            '2026-10-06';
        }


        if (
          $('#endDate')
        ) {
          $('#endDate').value =
            '2026-10-20';
        }


        if (
          $('#adults')
        ) {
          $('#adults').value =
            2;
        }


        if (
          $('#children')
        ) {
          $('#children').value =
            0;
        }


        renderAll();


        currentOfferTouched =
          true;


        scheduleAutoSave();


        toast(
          'تم تحميل الطلب'
        );
      }
    );


  /* =========================================================
     EXPORT HELPERS
     ========================================================= */

  function exportFileBase() {
    const quote =
      (
        $('#quoteNumber')?.value ||
        ''
      )
        .trim()
        .replace(
          /[^A-Za-z0-9_-]+/g,
          '-'
        )
        .replace(
          /^-+|-+$/g,
          ''
        );


    return quote
      ? `Offer-${quote}`
      : `Offer-${new Date().toISOString().slice(0, 10)}`;
  }


  function downloadBlob(
    blob,
    filename
  ) {
    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    link.href =
      url;


    link.download =
      filename;


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      60000
    );
  }


  function canvasBlob(
    canvas
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        canvas.toBlob(
          blob => {
            if (
              blob
            ) {
              resolve(
                blob
              );
            } else {
              reject(
                new Error(
                  'تعذر إنشاء الصورة'
                )
              );
            }
          },

          'image/png'
        );
      }
    );
  }


  /* =========================================================
     OFFER CANVAS
     ========================================================= */
async function loadCanvasSafeImage(
  url
) {
  const absoluteUrl =
    new URL(
      url,
      window.location.href
    ).href;


  const response =
    await fetch(
      absoluteUrl,
      {
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'no-store'
      }
    );


  if (
    !response.ok
  ) {
    throw new Error(
      `تعذر تحميل الصورة: ${absoluteUrl}`
    );
  }


  const blob =
    await response.blob();


  const dataUrl =
    await new Promise(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();


        reader.onload =
          () => {
            resolve(
              reader.result
            );
          };


        reader.onerror =
          () => {
            reject(
              new Error(
                'تعذر قراءة صورة الشعار'
              )
            );
          };


        reader.readAsDataURL(
          blob
        );
      }
    );


  const image =
    new Image();


  await new Promise(
    (
      resolve,
      reject
    ) => {
      image.onload =
        resolve;


      image.onerror =
        () => {
          reject(
            new Error(
              'تعذر تجهيز صورة الشعار'
            )
          );
        };


      image.src =
        dataUrl;
    }
  );


  return image;
}

     async function renderOfferCanvas() {
  if (
    document.fonts?.ready
  ) {
    await document.fonts.ready;
  }


  const source =
    $('#offerSheet');


  if (
    !source
  ) {
    throw new Error(
      'تعذر العثور على عرض العميل'
    );
  }


  if (
    typeof window.html2canvas !==
    'function'
  ) {
    throw new Error(
      'تعذر تحميل محرك إنشاء PDF'
    );
  }


  await nextFrame();


  /*
   * ننتظر تحميل جميع الصور الموجودة
   * داخل عرض العميل، ومنها الشعار.
   */
  const images = [
    ...source.querySelectorAll(
      'img'
    )
  ];


  await Promise.all(
    images.map(
      image => {
        if (
          image.complete &&
          image.naturalWidth >
            0
        ) {
          return Promise.resolve();
        }


        return new Promise(
          resolve => {
            const finish =
              () => {
                image.removeEventListener(
                  'load',
                  finish
                );


                image.removeEventListener(
                  'error',
                  finish
                );


                resolve();
              };


            image.addEventListener(
              'load',
              finish,
              {
                once: true
              }
            );


            image.addEventListener(
              'error',
              finish,
              {
                once: true
              }
            );


            setTimeout(
              finish,
              5000
            );
          }
        );
      }
    )
  );


  await nextFrame();


  const sourceRect =
    source.getBoundingClientRect();


  const width =
    Math.ceil(
      sourceRect.width
    );


  const height =
    Math.ceil(
      source.scrollHeight
    );


  if (
    !width ||
    !height
  ) {
    throw new Error(
      'عرض العميل غير جاهز'
    );
  }


  /*
   * نحفظ مواقع العناصر التي لا نريد
   * تقسيمها بين صفحات PDF.
   */
  const protectedRects =
    [];


  function protect(
    element
  ) {
    if (
      !element ||
      element.hidden
    ) {
      return;
    }


    const rect =
      element.getBoundingClientRect();


    if (
      rect.height <=
      2
    ) {
      return;
    }


    protectedRects.push({
      top:
        rect.top -
        sourceRect.top,

      bottom:
        rect.bottom -
        sourceRect.top,

      height:
        rect.height
    });
  }


  source
    .querySelectorAll(
      [
        '.client-flight-leg',
        '.hotel-client-item',
        '#clientTransfers .included-item',
        '#clientActivities .included-item',
        '.client-day',
        '.price-section',
        '.terms-section',
        '.offer-footer'
      ].join(',')
    )
    .forEach(
      protect
    );


  /*
   * عنوان المدينة مع أول فندق
   * يبقون مع بعض قدر الإمكان.
   */
  source
    .querySelectorAll(
      '.client-hotel-city'
    )
    .forEach(
      city => {
        const heading =
          city.querySelector(
            ':scope > h3'
          );


        const firstHotel =
          city.querySelector(
            '.hotel-client-item'
          );


        if (
          !heading ||
          !firstHotel
        ) {
          return;
        }


        const headingRect =
          heading
            .getBoundingClientRect();


        const hotelRect =
          firstHotel
            .getBoundingClientRect();


        const top =
          Math.min(
            headingRect.top,
            hotelRect.top
          ) -
          sourceRect.top;


        const bottom =
          Math.max(
            headingRect.bottom,
            hotelRect.bottom
          ) -
          sourceRect.top;


        protectedRects.push({
          top,
          bottom,

          height:
            bottom -
            top
        });
      }
    );


  const finalStartElement =
    source.querySelector(
      '#clientPriceSection:not([hidden])'
    ) ||
    source.querySelector(
      '#clientNotesSection:not([hidden])'
    ) ||
    source.querySelector(
      '.offer-footer'
    );


  const footerElement =
    source.querySelector(
      '.offer-footer'
    );


  const finalStartRect =
    finalStartElement
      ?.getBoundingClientRect() ||
    null;


  const footerRect =
    footerElement
      ?.getBoundingClientRect() ||
    null;


  /*
   * نحدد Scale مناسب.
   *
   * 2 يعطي جودة ممتازة للـPDF
   * بدون استهلاك ذاكرة ضخم.
   */
  const requestedScale =
    Math.min(
      2,

      Math.max(
        1.5,
        window.devicePixelRatio ||
        1
      )
    );


  /*
   * تصوير DOM مباشرة.
   *
   * foreignObjectRendering = false
   * مهم لأنه يمنع الرجوع إلى الطريقة
   * التي سببت مشكلة Canvas tainted.
   */
  const canvas =
    await window.html2canvas(
      source,
      {
        backgroundColor:
          '#ffffff',

        scale:
          requestedScale,

        useCORS:
          true,

        allowTaint:
          false,


        logging:
          false,

        imageTimeout:
          15000,

        removeContainer:
          true,

        scrollX:
          0,

        scrollY:
          -window.scrollY,

        width,

        height,

        windowWidth:
          Math.max(
            document.documentElement
              .clientWidth,
            width
          ),

        windowHeight:
          Math.max(
            document.documentElement
              .clientHeight,
            height
          ),

        onclone:
          clonedDocument => {
            const clonedSheet =
              clonedDocument
                .querySelector(
                  '#offerSheet'
                );


            if (
              !clonedSheet
            ) {
              return;
            }


            /*
             * إزالة أي حركات قد تغير
             * شكل الصورة أثناء الالتقاط.
             */
            clonedSheet
              .querySelectorAll(
                '*'
              )
              .forEach(
                element => {
                  element.style
                    .setProperty(
                      'animation',
                      'none',
                      'important'
                    );


                  element.style
                    .setProperty(
                      'transition',
                      'none',
                      'important'
                    );
                }
              );


            clonedSheet.style
              .setProperty(
                'box-shadow',
                'none',
                'important'
              );
          }
      }
    );


  if (
    !canvas.width ||
    !canvas.height
  ) {
    throw new Error(
      'تعذر تصوير العرض'
    );
  }


  /*
   * نحسب Scale الحقيقي بدل الاعتماد
   * على القيمة المطلوبة فقط.
   */
  const actualScale =
    canvas.width /
    width;


  /*
   * اختبار مهم.
   *
   * إذا كان Canvas نظيفاً سيعمل بدون
   * SecurityError.
   */
  const testContext =
    canvas.getContext(
      '2d'
    );


  if (
    !testContext
  ) {
    throw new Error(
      'تعذر قراءة صورة العرض'
    );
  }


  try {
    testContext.getImageData(
      0,
      0,
      1,
      1
    );
  } catch (
    error
  ) {
    console.error(
      '[Canvas security test]',
      error
    );


    throw new Error(
      'يوجد مورد خارجي غير مسموح داخل العرض'
    );
  }


  /*
   * المعلومات المستخدمة في تقسيم
   * العرض إلى صفحات PDF.
   */
  canvas.offerLayout = {
    scale:
      actualScale,

    protectedRanges:
      protectedRects.map(
        rect => ({
          top:
            Math.round(
              rect.top *
              actualScale
            ),

          bottom:
            Math.round(
              rect.bottom *
              actualScale
            ),

          height:
            Math.round(
              rect.height *
              actualScale
            )
        })
      ),

    finalBlockTop:
      finalStartRect
        ? Math.max(
            0,

            Math.round(
              (
                finalStartRect.top -
                sourceRect.top
              ) *
              actualScale
            )
          )
        : null,

    finalBlockBottom:
      footerRect
        ? Math.min(
            canvas.height,

            Math.round(
              (
                footerRect.bottom -
                sourceRect.top
              ) *
              actualScale
            )
          )
        : null
  };


  return canvas;
}


  /* =========================================================
     PDF PAGES
     ========================================================= */

  function pageMetrics(
    fullCanvas
  ) {
    const pageHeight =
      Math.round(
        fullCanvas.width *
        297 /
        210
      );


    const layout =
      fullCanvas.offerLayout ||
      {};


    const protectedRanges =
      layout.protectedRanges ||
      [];


    const continuationTopPadding =
      Math.round(
        fullCanvas.width *
        14 /
        210
      );


    const continuationBottomPadding =
      Math.round(
        fullCanvas.width *
        8 /
        210
      );


    const safetyGap =
      Math.max(
        12,

        Math.round(
          fullCanvas.width *
          .008
        )
      );


    const finalGap =
      Math.max(
        14,

        Math.round(
          fullCanvas.width *
          .012
        )
      );


    const finalTop =
      Number.isFinite(
        layout.finalBlockTop
      )
        ? layout.finalBlockTop
        : null;


    const finalBottom =
      Number.isFinite(
        layout.finalBlockBottom
      )
        ? layout.finalBlockBottom
        : null;


    const hasFinal =
      finalTop !==
        null &&
      finalBottom !==
        null &&
      finalBottom >
        finalTop;


    const finalHeight =
      hasFinal
        ? finalBottom -
          finalTop
        : 0;


    const normalEnd =
      hasFinal
        ? finalTop
        : fullCanvas.height;


    const pages =
      [];


    let sourceY =
      0;


    while (
      sourceY <
      normalEnd
    ) {
      const first =
        pages.length ===
        0;


      const topPadding =
        first
          ? 0
          : continuationTopPadding;


      const bottomPadding =
        first
          ? 0
          : continuationBottomPadding;


      const available =
        pageHeight -
        topPadding -
        bottomPadding;


      let cutY =
        Math.min(
          sourceY +
          available,
          normalEnd
        );


      if (
        cutY <
        normalEnd
      ) {
        const crossing =
          protectedRanges.filter(
            range => {
              if (
                range.height >
                available
              ) {
                return false;
              }


              return (
                range.top <
                  cutY &&
                range.bottom >
                  cutY &&
                range.top >=
                  sourceY &&
                (
                  !hasFinal ||
                  range.top <
                    finalTop
                )
              );
            }
          );


        if (
          crossing.length
        ) {
          const earliestTop =
            Math.min(
              ...crossing.map(
                range =>
                  range.top
              )
            );


          const proposed =
            earliestTop -
            safetyGap;


          if (
            proposed >
            sourceY +
            safetyGap
          ) {
            cutY =
              proposed;
          }
        }
      }


      if (
        cutY <=
        sourceY
      ) {
        cutY =
          Math.min(
            sourceY +
            available,
            normalEnd
          );
      }


      pages.push({
        topPadding,
        bottomPadding,

        parts: [
          {
            sourceY,

            sourceHeight:
              cutY -
              sourceY,

            destinationY:
              topPadding
          }
        ]
      });


      sourceY =
        cutY;
    }


    if (
      hasFinal
    ) {
      let placed =
        false;


      const lastPage =
        pages[
          pages.length -
          1
        ];


      if (
        lastPage &&
        finalHeight <=
          pageHeight -
          lastPage.bottomPadding
      ) {
        const lastPart =
          lastPage.parts[
            lastPage.parts.length -
            1
          ];


        const usedBottom =
          lastPart.destinationY +
          lastPart.sourceHeight;


        const destinationY =
          pageHeight -
          lastPage.bottomPadding -
          finalHeight;


        if (
          usedBottom +
          finalGap <=
          destinationY
        ) {
          lastPage.parts.push({
            sourceY:
              finalTop,

            sourceHeight:
              finalHeight,

            destinationY,

            final:
              true
          });


          placed =
            true;
        }
      }


      if (
        !placed
      ) {
        const first =
          pages.length ===
          0;


        const topPadding =
          first
            ? 0
            : continuationTopPadding;


        const bottomPadding =
          first
            ? 0
            : continuationBottomPadding;


        const available =
          pageHeight -
          topPadding -
          bottomPadding;


        if (
          finalHeight <=
          available
        ) {
          pages.push({
            topPadding,
            bottomPadding,

            parts: [
              {
                sourceY:
                  finalTop,

                sourceHeight:
                  finalHeight,

                destinationY:
                  pageHeight -
                  bottomPadding -
                  finalHeight,

                final:
                  true
              }
            ]
          });
        } else {
          let currentY =
            finalTop;


          while (
            currentY <
            finalBottom
          ) {
            const currentAvailable =
              pageHeight -
              continuationTopPadding -
              continuationBottomPadding;


            const currentHeight =
              Math.min(
                currentAvailable,

                finalBottom -
                currentY
              );


            pages.push({
              topPadding:
                continuationTopPadding,

              bottomPadding:
                continuationBottomPadding,

              parts: [
                {
                  sourceY:
                    currentY,

                  sourceHeight:
                    currentHeight,

                  destinationY:
                    continuationTopPadding
                }
              ]
            });


            currentY +=
              currentHeight;
          }
        }
      }
    }


    if (
      !pages.length
    ) {
      pages.push({
        topPadding:
          0,

        bottomPadding:
          0,

        parts: [
          {
            sourceY:
              0,

            sourceHeight:
              Math.min(
                fullCanvas.height,
                pageHeight
              ),

            destinationY:
              0
          }
        ]
      });
    }


    return {
      height:
        pageHeight,

      pages,

      count:
        pages.length
    };
  }


  function renderPageCanvas(
    fullCanvas,
    index,
    metrics
  ) {
    const data =
      metrics.pages[
        index
      ];


    if (
      !data
    ) {
      throw new Error(
        `صفحة غير صالحة: ${index + 1}`
      );
    }


    const page =
      document.createElement(
        'canvas'
      );


    page.width =
      fullCanvas.width;


    page.height =
      metrics.height;


    const context =
      page.getContext(
        '2d',
        {
          alpha:
            false
        }
      );


    context.fillStyle =
      '#fff';


    context.fillRect(
      0,
      0,
      page.width,
      page.height
    );


    data.parts.forEach(
      part => {
        const sourceY =
          Math.max(
            0,
            part.sourceY
          );


        const sourceHeight =
          Math.min(
            part.sourceHeight,

            fullCanvas.height -
            sourceY
          );


        if (
          sourceHeight <=
          0
        ) {
          return;
        }


        context.drawImage(
          fullCanvas,

          0,
          sourceY,
          fullCanvas.width,
          sourceHeight,

          0,
          part.destinationY,
          fullCanvas.width,
          sourceHeight
        );
      }
    );


    return page;
  }


  /* =========================================================
     ZIP
     ========================================================= */

  const crcTable =
    (() => {
      const table =
        new Uint32Array(
          256
        );


      for (
        let n =
          0;

        n <
        256;

        n +=
          1
      ) {
        let value =
          n;


        for (
          let index =
            0;

          index <
          8;

          index +=
            1
        ) {
          value =
            value &
            1
              ? (
                  0xedb88320 ^
                  (
                    value >>>
                    1
                  )
                )
              : (
                  value >>>
                  1
                );
        }


        table[
          n
        ] =
          value >>>
          0;
      }


      return table;
    })();


  function crc32(
    bytes
  ) {
    let value =
      0xffffffff;


    for (
      const byte of
      bytes
    ) {
      value =
        crcTable[
          (
            value ^
            byte
          ) &
          0xff
        ] ^
        (
          value >>>
          8
        );
    }


    return (
      value ^
      0xffffffff
    ) >>>
    0;
  }


  function little16(
    value
  ) {
    const bytes =
      new Uint8Array(
        2
      );


    new DataView(
      bytes.buffer
    ).setUint16(
      0,
      value,
      true
    );


    return bytes;
  }


  function little32(
    value
  ) {
    const bytes =
      new Uint8Array(
        4
      );


    new DataView(
      bytes.buffer
    ).setUint32(
      0,
      value >>>
      0,
      true
    );


    return bytes;
  }


  function joinBytes(
    parts
  ) {
    const result =
      new Uint8Array(
        parts.reduce(
          (
            sum,
            part
          ) =>
            sum +
            part.length,
          0
        )
      );


    let offset =
      0;


    parts.forEach(
      part => {
        result.set(
          part,
          offset
        );


        offset +=
          part.length;
      }
    );


    return result;
  }


  function zipPngFiles(
    files
  ) {
    const encoder =
      new TextEncoder();


    const localParts =
      [];


    const centralParts =
      [];


    let localOffset =
      0;


    files.forEach(
      file => {
        const name =
          encoder.encode(
            file.name
          );


        const checksum =
          crc32(
            file.bytes
          );


        const localHeader =
          joinBytes([
            little32(
              0x04034b50
            ),

            little16(
              20
            ),

            little16(
              0x0800
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little32(
              checksum
            ),

            little32(
              file.bytes.length
            ),

            little32(
              file.bytes.length
            ),

            little16(
              name.length
            ),

            little16(
              0
            ),

            name
          ]);


        localParts.push(
          localHeader,
          file.bytes
        );


        const centralHeader =
          joinBytes([
            little32(
              0x02014b50
            ),

            little16(
              20
            ),

            little16(
              20
            ),

            little16(
              0x0800
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little32(
              checksum
            ),

            little32(
              file.bytes.length
            ),

            little32(
              file.bytes.length
            ),

            little16(
              name.length
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little32(
              0
            ),

            little32(
              localOffset
            ),

            name
          ]);


        centralParts.push(
          centralHeader
        );


        localOffset +=
          localHeader.length +
          file.bytes.length;
      }
    );


    const central =
      joinBytes(
        centralParts
      );


    const end =
      joinBytes([
        little32(
          0x06054b50
        ),

        little16(
          0
        ),

        little16(
          0
        ),

        little16(
          files.length
        ),

        little16(
          files.length
        ),

        little32(
          central.length
        ),

        little32(
          localOffset
        ),

        little16(
          0
        )
      ]);


    return new Blob(
      [
        ...localParts,
        central,
        end
      ],

      {
        type:
          'application/zip'
      }
    );
  }


  /* =========================================================
     PDF
     ========================================================= */

  async function compressedRgb(
    canvas
  ) {
    if (
      typeof CompressionStream ===
      'undefined'
    ) {
      throw new Error(
        'إنشاء PDF يحتاج Chrome أو Edge حديث.'
      );
    }


    const context =
      canvas.getContext(
        '2d'
      );


    const pixels =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;


    const rgb =
      new Uint8Array(
        canvas.width *
        canvas.height *
        3
      );


    for (
      let source =
        0,
          target =
            0;

      source <
      pixels.length;

      source +=
        4
    ) {
      rgb[
        target++
      ] =
        pixels[
          source
        ];


      rgb[
        target++
      ] =
        pixels[
          source +
          1
        ];


      rgb[
        target++
      ] =
        pixels[
          source +
          2
        ];
    }


    const stream =
      new Blob([
        rgb
      ])
        .stream()
        .pipeThrough(
          new CompressionStream(
            'deflate'
          )
        );


    return new Uint8Array(
      await new Response(
        stream
      ).arrayBuffer()
    );
  }


  async function imagePagesPdf(
    fullCanvas
  ) {
    const metrics =
      pageMetrics(
        fullCanvas
      );


    const encoder =
      new TextEncoder();


    const images =
      [];


    for (
      let index =
        0;

      index <
      metrics.count;

      index +=
        1
    ) {
      const page =
        renderPageCanvas(
          fullCanvas,
          index,
          metrics
        );


      images.push({
        width:
          page.width,

        height:
          page.height,

        bytes:
          await compressedRgb(
            page
          )
      });
    }


    const parts = [
      new Uint8Array([
        37,
        80,
        68,
        70,
        45,
        49,
        46,
        52,
        10
      ])
    ];


    const offsets = [
      0
    ];


    let length =
      parts[0].length;


    function add(
      value
    ) {
      const bytes =
        typeof value ===
        'string'
          ? encoder.encode(
              value
            )
          : value;


      parts.push(
        bytes
      );


      length +=
        bytes.length;
    }


    function beginObject(
      number
    ) {
      offsets[
        number
      ] =
        length;


      add(
        `${number} 0 obj\n`
      );
    }


    beginObject(
      1
    );


    add(
      '<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
    );


    beginObject(
      2
    );


    add(
      `<< /Type /Pages /Count ${images.length} /Kids [` +
      images
        .map(
          (
            _,
            index
          ) =>
            `${3 + index * 3} 0 R`
        )
        .join(
          ' '
        ) +
      '] >>\nendobj\n'
    );


    images.forEach(
      (
        image,
        index
      ) => {
        const pageObject =
          3 +
          index *
          3;


        const imageObject =
          pageObject +
          1;


        const contentObject =
          pageObject +
          2;


        const imageName =
          `Im${index + 1}`;


        beginObject(
          pageObject
        );


        add(
          `<< /Type /Page /Parent 2 0 R ` +
          `/MediaBox [0 0 595.28 841.89] ` +
          `/Resources << /XObject << /${imageName} ${imageObject} 0 R >> >> ` +
          `/Contents ${contentObject} 0 R >>\nendobj\n`
        );


        beginObject(
          imageObject
        );


        add(
          `<< /Type /XObject /Subtype /Image ` +
          `/Width ${image.width} ` +
          `/Height ${image.height} ` +
          `/ColorSpace /DeviceRGB ` +
          `/BitsPerComponent 8 ` +
          `/Filter /FlateDecode ` +
          `/Length ${image.bytes.length} >>\nstream\n`
        );


        add(
          image.bytes
        );


        add(
          '\nendstream\nendobj\n'
        );


        const commands =
          `q\n` +
          `595.28 0 0 841.89 0 0 cm\n` +
          `/${imageName} Do\n` +
          `Q\n`;


        beginObject(
          contentObject
        );


        add(
          `<< /Length ${encoder.encode(commands).length} >>\n` +
          `stream\n` +
          `${commands}` +
          `endstream\n` +
          `endobj\n`
        );
      }
    );


    const xrefOffset =
      length;


    add(
      `xref\n0 ${offsets.length}\n`
    );


    add(
      '0000000000 65535 f \n'
    );


    for (
      let number =
        1;

      number <
      offsets.length;

      number +=
        1
    ) {
      add(
        `${String(offsets[number]).padStart(10, '0')} 00000 n \n`
      );
    }


    add(
      `trailer\n` +
      `<< /Size ${offsets.length} /Root 1 0 R >>\n` +
      `startxref\n` +
      `${xrefOffset}\n` +
      `%%EOF`
    );


    return new Blob(
      parts,

      {
        type:
          'application/pdf'
      }
    );
  }


  /* =========================================================
     EXPORT WORKFLOW
     ========================================================= */

  async function runImageExport(
    button,
    action
  ) {
    if (
      !button
    ) {
      return;
    }


    const buttons = [
      ...new Set(
        [
          ...$$(
            '#imageExportMenu button'
          ),

          $('#printOfferBtn'),

          button
        ].filter(
          Boolean
        )
      )
    ];


    const originalText =
      button.textContent;


    buttons.forEach(
      current => {
        current.disabled =
          true;
      }
    );


    button.textContent =
      'جاري الإنشاء...';


    try {
      if (
        document.fonts?.ready
      ) {
        await document.fonts.ready;
      }


      await nextFrame();


      const canvas =
        await renderOfferCanvas();


      await action(
        canvas
      );


      if (
        $('#imageExportMenu')
      ) {
        $('#imageExportMenu').open =
          false;
      }
    } catch (
      error
    ) {
      console.error(
        '[Export]',
        error
      );


      toast(
        error?.message ||
        'تعذر إنشاء الملف'
      );
    } finally {
      button.textContent =
        originalText;


      buttons.forEach(
        current => {
          current.disabled =
            false;
        }
      );
    }
  }


  /* =========================================================
     PDF PREVIEW
     ========================================================= */

  let currentPdfPreviewBlob =
    null;


  let currentPdfPreviewUrl =
    null;


  let currentPdfPreviewFilename =
    'Offer.pdf';


  function releasePdfPreview() {
    $('#pdfPreviewFrame')
      ?.removeAttribute(
        'src'
      );


    if (
      currentPdfPreviewUrl
    ) {
      URL.revokeObjectURL(
        currentPdfPreviewUrl
      );
    }


    currentPdfPreviewBlob =
      null;


    currentPdfPreviewUrl =
      null;
  }


  async function openPdfPreview(
    button
  ) {
    await runImageExport(
      button,

      async canvas => {
        const blob =
          await imagePagesPdf(
            canvas
          );


        releasePdfPreview();


        currentPdfPreviewBlob =
          blob;


        currentPdfPreviewFilename =
          `${exportFileBase()}.pdf`;


        currentPdfPreviewUrl =
          URL.createObjectURL(
            blob
          );


        if (
          $('#pdfPreviewFrame')
        ) {
          $('#pdfPreviewFrame').src =
            `${currentPdfPreviewUrl}#toolbar=1&navpanes=0&view=FitH`;
        }


        setText(
          '#pdfPreviewFilename',
          currentPdfPreviewFilename
        );


        $('#pdfPreviewDialog')
          ?.showModal();
      }
    );
  }


  $('#printOfferBtn')
    ?.addEventListener(
      'click',

      event => {
        openPdfPreview(
          event.currentTarget
        );
      }
    );


  $('#exportImagePdfBtn')
    ?.addEventListener(
      'click',

      event => {
        openPdfPreview(
          event.currentTarget
        );
      }
    );


  $('#downloadPreviewPdfBtn')
    ?.addEventListener(
      'click',

      () => {
        if (
          !currentPdfPreviewBlob
        ) {
          toast(
            'لا يوجد ملف جاهز'
          );


          return;
        }


        downloadBlob(
          currentPdfPreviewBlob,
          currentPdfPreviewFilename
        );
      }
    );


  $('#closePdfPreviewBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#pdfPreviewDialog')
          ?.close();
      }
    );


  $('#cancelPdfPreviewBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#pdfPreviewDialog')
          ?.close();
      }
    );


  $('#pdfPreviewDialog')
    ?.addEventListener(
      'close',
      releasePdfPreview
    );


  /* =========================================================
     PNG EXPORT
     ========================================================= */

  $('#exportLongPngBtn')
    ?.addEventListener(
      'click',

      event => {
        runImageExport(
          event.currentTarget,

          async canvas => {
            const blob =
              await canvasBlob(
                canvas
              );


            downloadBlob(
              blob,
              `${exportFileBase()}.png`
            );


            toast(
              'تم تحميل الصورة'
            );
          }
        );
      }
    );


  $('#exportPagedPngBtn')
    ?.addEventListener(
      'click',

      event => {
        runImageExport(
          event.currentTarget,

          async canvas => {
            const metrics =
              pageMetrics(
                canvas
              );


            const files =
              [];


            for (
              let index =
                0;

              index <
              metrics.count;

              index +=
                1
            ) {
              const page =
                renderPageCanvas(
                  canvas,
                  index,
                  metrics
                );


              const blob =
                await canvasBlob(
                  page
                );


              files.push({
                name:
                  `Offer-Page-${index + 1}.png`,

                bytes:
                  new Uint8Array(
                    await blob.arrayBuffer()
                  )
              });
            }


            if (
              files.length ===
              1
            ) {
              downloadBlob(
                new Blob(
                  [
                    files[0].bytes
                  ],

                  {
                    type:
                      'image/png'
                  }
                ),

                files[0].name
              );
            } else {
              downloadBlob(
                zipPngFiles(
                  files
                ),

                `${exportFileBase()}-PNG-Pages.zip`
              );
            }


            toast(
              'تم إنشاء صفحات PNG'
            );
          }
        );
      }
    );


  /* =========================================================
     COPY OFFER
     ========================================================= */

  $('#copyOfferBtn')
    ?.addEventListener(
      'click',

      async () => {
        const result =
          totals();


        const hotelText =
          state.services
            .filter(
              item =>
                item.category ===
                'hotel'
            )
            .map(
              item =>
                `• ${item.city} - ${item.name} - ${item.details} - ` +
                `${formatFlexibleClientDate(item.checkIn)} ${item.checkInTime || ''} ` +
                `إلى ${formatFlexibleClientDate(item.checkOut)} ${item.checkOutTime || ''}`
            )
            .join(
              '\n'
            );


        const text =
          `${defaultCopy.brandName}\n` +
          `${getUserName()}\n` +
          `رقم العرض: ${$('#quoteNumber')?.value || ''}\n` +
          `العميل: ${$('#clientName')?.value || 'ضيفنا الكريم'}\n` +
          `الوجهة: ${$('#destination')?.value || ''}\n` +
          `المدة: ${$('#durationDisplay')?.value || ''}\n\n` +
          `${
            hotelText
              ? `الفنادق:\n${hotelText}\n\n`
              : ''
          }` +
          `إجمالي العرض: ${
            result.total >
            0
              ? money.format(
                  result.total
                )
              : 'بانتظار التسعير'
          }`;


        try {
          await navigator.clipboard.writeText(
            text
          );


          toast(
            'تم نسخ ملخص العرض'
          );
        } catch {
          toast(
            'تعذر النسخ'
          );
        }
      }
    );


  /* =========================================================
     GLOBAL AUTOSAVE
     ========================================================= */

  document.addEventListener(
    'input',

    event => {
      if (
        event.target.closest(
          '#savedOffersDialog, #pdfPreviewDialog'
        )
      ) {
        return;
      }


      if (
        event.target.dataset
          ?.copyKey ===
        'brandTagline'
      ) {
        return;
      }


      if (
        event.target.matches(
          'input, textarea, select'
        )
      ) {
        scheduleAutoSave();
      }
    }
  );


  document.addEventListener(
    'change',

    event => {
      if (
        event.target.closest(
          '#savedOffersDialog, #pdfPreviewDialog'
        )
      ) {
        return;
      }


      if (
        event.target.dataset
          ?.copyKey
      ) {
        return;
      }


      if (
        event.target.matches(
          'input, textarea, select'
        )
      ) {
        scheduleAutoSave();
      }
    }
  );
/* =========================================================
   AI OFFER IMPORT
   ========================================================= */

let importImagePreviewUrl =
  null;


function setImportStatus(
  message = '',
  isError = false
) {
  const element =
    $('#importOfferStatus');


  if (
    !element
  ) {
    return;
  }


  element.hidden =
    !message;


  element.textContent =
    message;


  element.classList.toggle(
    'is-error',
    isError
  );
}


function clearImportImagePreview() {
  if (
    importImagePreviewUrl
  ) {
    URL.revokeObjectURL(
      importImagePreviewUrl
    );


    importImagePreviewUrl =
      null;
  }


  const preview =
    $('#importImagePreview');


  const wrap =
    $('#importImagePreviewWrap');


  if (
    preview
  ) {
    preview.removeAttribute(
      'src'
    );
  }


  if (
    wrap
  ) {
    wrap.hidden =
      true;
  }
}


function resetImportOfferDialog() {
  const prompt =
    $('#importOfferPrompt');


  const image =
    $('#importOfferImage');


  const mode =
    $('#importOfferMode');


  if (
    prompt
  ) {
    prompt.value =
      '';
  }


  if (
    image
  ) {
    image.value =
      '';
  }


  if (
    mode
  ) {
    mode.value =
      'new';
  }


  clearImportImagePreview();


  setImportStatus();
}


function fileToImageElement(
  file
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const url =
        URL.createObjectURL(
          file
        );


      const image =
        new Image();


      image.onload =
        () => {
          URL.revokeObjectURL(
            url
          );


          resolve(
            image
          );
        };


      image.onerror =
        () => {
          URL.revokeObjectURL(
            url
          );


          reject(
            new Error(
              'تعذر قراءة الصورة'
            )
          );
        };


      image.src =
        url;
    }
  );
}


async function importImageFileToDataUrl(
  file
) {
  if (
    !file
  ) {
    return null;
  }


  const allowedTypes =
    new Set([
      'image/jpeg',
      'image/png',
      'image/webp'
    ]);


  if (
    !allowedTypes.has(
      file.type
    )
  ) {
    throw new Error(
      'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP'
    );
  }


  if (
    file.size >
    12 * 1024 * 1024
  ) {
    throw new Error(
      'حجم الصورة أكبر من 12MB'
    );
  }


  const image =
    await fileToImageElement(
      file
    );


  const maxDimension =
    1800;


  const ratio =
    Math.min(
      1,

      maxDimension /
      Math.max(
        image.naturalWidth,
        image.naturalHeight
      )
    );


  const width =
    Math.max(
      1,

      Math.round(
        image.naturalWidth *
        ratio
      )
    );


  const height =
    Math.max(
      1,

      Math.round(
        image.naturalHeight *
        ratio
      )
    );


  const canvas =
    document.createElement(
      'canvas'
    );


  canvas.width =
    width;


  canvas.height =
    height;


  const context =
    canvas.getContext(
      '2d'
    );


  if (
    !context
  ) {
    throw new Error(
      'تعذر تجهيز الصورة'
    );
  }


  context.fillStyle =
    '#ffffff';


  context.fillRect(
    0,
    0,
    width,
    height
  );


  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );


  return canvas.toDataURL(
    'image/jpeg',
    0.88
  );
}


function setImportedField(
  id,
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return;
  }


  const element =
    $(`#${id}`);


  if (
    !element
  ) {
    return;
  }


  if (
    element.type ===
    'checkbox'
  ) {
    element.checked =
      Boolean(
        value
      );


    return;
  }


  element.value =
    String(
      value
    );
}


function importedServiceToState(
  service
) {
  const allowedCategories =
    new Set([
      'flight',
      'hotel',
      'transfer',
      'activity'
    ]);


  const category =
    allowedCategories.has(
      service?.category
    )
      ? service.category
      : 'transfer';


  const item = {
  id:
    `service-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,

  category,

  name:
    $('#newServiceName')
      ?.value
      .trim() ||
    '',

  details:
    $('#newServiceDetails')
      ?.value
      .trim() ||
    '',

  costMode:
    $('#newServiceCostMode')
      ?.value ||
    'total',

  qty:
    Math.max(
      1,
      toNumber(
        $('#newServiceQty')?.value,
        1
      )
    ),

  cost:
    Math.max(
      0,
      toNumber(
        $('#newServiceCost')?.value
      )
    ),

  flightType:
    category ===
      'flight'
      ? (
          $('#newFlightType')
            ?.value ===
            'domestic'
            ? 'domestic'
            : 'international'
        )
      : ''
};


  if (
    category ===
    'hotel'
  ) {
    item.city =
      String(
        service?.city ||
        'غير محددة'
      ).trim();


    item.checkIn =
      String(
        service?.checkIn ||
        ''
      ).trim();


    item.checkInTime =
      String(
        service?.checkInTime ||
        ''
      ).trim();


    item.checkOut =
      String(
        service?.checkOut ||
        ''
      ).trim();


    item.checkOutTime =
      String(
        service?.checkOutTime ||
        ''
      ).trim();


    item.hotelTax =
      Math.max(
        0,
        toNumber(
          service?.hotelTax
        )
      );
  }


  if (
    category ===
    'flight'
  ) {
    const segments =
      Array.isArray(
        service?.segments
      )
        ? service.segments
        : [];


    item.segments =
      segments.map(
        segment =>
          createSegment(
            String(
              segment?.from ||
              ''
            ).trim(),

            String(
              segment?.to ||
              ''
            ).trim(),

            String(
              segment?.departureDate ||
              ''
            ).trim(),

            String(
              segment?.departureTime ||
              ''
            ).trim(),

            String(
              segment?.arrivalDate ||
              ''
            ).trim(),

            String(
              segment?.arrivalTime ||
              ''
            ).trim(),

            Math.max(
              0,
              toNumber(
                segment?.price
              )
            ),

            String(
              segment?.extraDetails ||
              ''
            ).trim()
          )
      );


    if (
      !item.segments.length
    ) {
      item.segments.push(
        createSegment()
      );
    }
  }


  return item;
}


function applyImportedOffer(
  imported,
  mode = 'new'
) {
  if (
    !imported ||
    typeof imported !==
    'object'
  ) {
    throw new Error(
      'بيانات العرض المستخرجة غير صالحة'
    );
  }


  /*
   * إذا اخترنا إنشاء عرض جديد،
   * نحفظ الحالي أولاً ثم نفتح عرض جديد.
   */
  if (
    mode ===
    'new'
  ) {
    startNewOffer(
      true
    );
  }


  /*
   * رقم العرض لا يأتي من الذكاء الاصطناعي.
   * نظام البرنامج الحالي هو المسؤول عنه.
   */
  setImportedField(
    'clientName',
    imported.clientName
  );


  setImportedField(
    'origin',
    imported.origin
  );


  setImportedField(
    'destination',
    imported.destination
  );


  setImportedField(
    'startDate',
    imported.startDate
  );


  setImportedField(
    'endDate',
    imported.endDate
  );


  if (
    imported.adults !== null &&
    imported.adults !== undefined
  ) {
    setImportedField(
      'adults',
      imported.adults
    );
  }


  if (
    imported.children !== null &&
    imported.children !== undefined
  ) {
    setImportedField(
      'children',
      imported.children
    );
  }


  if (
    imported.internalNotes
  ) {
    const notes =
      $('#internalNotes');


    if (
      notes
    ) {
      if (
        mode === 'current' &&
        notes.value.trim()
      ) {
        notes.value =
          `${notes.value.trim()}\n${imported.internalNotes}`;
      } else {
        notes.value =
          imported.internalNotes;
      }
    }
  }


  /*
   * الخدمات.
   */
  const importedServices =
    Array.isArray(
      imported.services
    )
      ? imported.services
          .filter(
            Boolean
          )
          .map(
            importedServiceToState
          )
      : [];


  if (
    importedServices.length
  ) {
    if (
      mode ===
      'new'
    ) {
      state.services =
        importedServices;
    } else {
      state.services.push(
        ...importedServices
      );
    }
  }


  /*
   * برنامج الرحلة.
   */
  const importedItinerary =
    Array.isArray(
      imported.itinerary
    )
      ? imported.itinerary
          .filter(
            day =>
              day &&
              (
                day.title ||
                day.details
              )
          )
          .map(
            day => ({
              title:
                String(
                  day.title ||
                  'يوم جديد'
                ).trim(),

              details:
                String(
                  day.details ||
                  ''
                ).trim()
            })
          )
      : [];


  if (
    importedItinerary.length
  ) {
    if (
      mode ===
      'new'
    ) {
      state.itinerary =
        importedItinerary;
    } else {
      state.itinerary.push(
        ...importedItinerary
      );
    }
  }


  /*
   * إنشاء قائمة مدن الفنادق تلقائياً.
   */
  const hotelCities =
    state.services
      .filter(
        item =>
          item.category ===
          'hotel'
      )
      .map(
        item =>
          String(
            item.city ||
            ''
          ).trim()
      )
      .filter(
        Boolean
      );


  state.hotelCities =
    [
      ...new Set([
        ...state.hotelCities,
        ...hotelCities
      ])
    ];


  renderAll();


  renderChildAges();


  currentOfferTouched =
    true;


  scheduleAutoSave();


  updateActiveOfferStatus();
}


$('#importOfferBtn')
  ?.addEventListener(
    'click',
    () => {
      resetImportOfferDialog();


      $('#importOfferDialog')
        ?.showModal();
    }
  );


$('#closeImportOfferBtn')
  ?.addEventListener(
    'click',
    () => {
      $('#importOfferDialog')
        ?.close();


      clearImportImagePreview();
    }
  );


$('#cancelImportOfferBtn')
  ?.addEventListener(
    'click',
    () => {
      $('#importOfferDialog')
        ?.close();


      clearImportImagePreview();
    }
  );


$('#importOfferImage')
  ?.addEventListener(
    'change',
    event => {
      clearImportImagePreview();


      const file =
        event.target.files?.[0];


      if (
        !file
      ) {
        return;
      }


      importImagePreviewUrl =
        URL.createObjectURL(
          file
        );


      const preview =
        $('#importImagePreview');


      const wrap =
        $('#importImagePreviewWrap');


      if (
        preview
      ) {
        preview.src =
          importImagePreviewUrl;
      }


      if (
        wrap
      ) {
        wrap.hidden =
          false;
      }


      setImportStatus(
        'الصورة جاهزة للتحليل'
      );
    }
  );


$('#importOfferForm')
  ?.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      const prompt =
        $('#importOfferPrompt')
          ?.value
          .trim() ||
        '';


      const file =
        $('#importOfferImage')
          ?.files?.[0] ||
        null;


      const mode =
        $('#importOfferMode')
          ?.value ||
        'new';


      if (
        !prompt &&
        !file
      ) {
        setImportStatus(
          'اكتب تفاصيل العرض أو ارفع صورة أولاً.',
          true
        );


        return;
      }


      const button =
        $('#analyzeImportOfferBtn');


      const originalText =
        button?.textContent ||
        'تحليل واستيراد';


      if (
        button
      ) {
        button.disabled =
          true;


        button.textContent =
          'جاري التحليل...';
      }


      setImportStatus(
        file
          ? 'جاري قراءة الصورة واستخراج بيانات العرض...'
          : 'جاري تحليل تفاصيل العرض...'
      );


      try {
        const imageDataUrl =
          file
            ? await importImageFileToDataUrl(
                file
              )
            : null;


        const response =
          await fetch(
            AI_IMPORT_ENDPOINT,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  prompt,
                  imageDataUrl
                })
            }
          );


        let result;


        try {
          result =
            await response.json();
        } catch {
          throw new Error(
            'الـWorker أعاد استجابة غير صالحة'
          );
        }


        if (
          !response.ok
        ) {
          throw new Error(
            result?.error ||
            `فشل الاستيراد، رمز الخطأ ${response.status}`
          );
        }


        if (
          !result?.offer
        ) {
          throw new Error(
            'لم يتم العثور على بيانات عرض في الاستجابة'
          );
        }


        applyImportedOffer(
          result.offer,
          mode
        );


        $('#importOfferDialog')
          ?.close();


        clearImportImagePreview();


        toast(
          'تم استيراد بيانات العرض بنجاح'
        );
      } catch (
        error
      ) {
        console.error(
          '[AI Offer Import]',
          error
        );


        setImportStatus(
          error?.message ||
          'تعذر استيراد العرض',
          true
        );
      } finally {
        if (
          button
        ) {
          button.disabled =
            false;


          button.textContent =
            originalText;
        }
      }
    }
  );
function getIntakesAdminKey() {
  let key =
    sessionStorage.getItem(
      'konooz-intakes-admin-key'
    ) ||
    '';


  if (
    key
  ) {
    return key;
  }


  key =
    (
      window.prompt(
        'أدخل مفتاح إدارة طلبات العملاء'
      ) ||
      ''
    )
      .trim();


  if (
    key
  ) {
    sessionStorage.setItem(
      'konooz-intakes-admin-key',
      key
    );
  }


  return key;
}


function setClientIntakesStatus(
  message,
  type = ''
) {
  const status =
    $('#clientIntakesStatus');


  if (
    !status
  ) {
    return;
  }


  status.hidden =
    !message;


  status.textContent =
    message;


  status.classList.toggle(
    'is-error',
    type === 'error'
  );
}


function formatIntakeDate(
  value
) {
  if (
    !value
  ) {
    return 'غير محدد';
  }
function formatIntakeCreatedAt(
  value
) {
  if (
    !value
  ) {
    return 'غير محدد';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleString(
    'ar-SA',
    {
      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      hour:
        '2-digit',

      minute:
        '2-digit'
    }
  );
}

  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleDateString(
    'ar-SA',
    {
      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit'
    }
  );
}
function formatIntakeCreatedAt(
  value
) {
  if (
    !value
  ) {
    return 'غير محدد';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleString(
    'ar-SA',
    {
      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      hour:
        '2-digit',

      minute:
        '2-digit'
    }
  );
}

function intakeValue(
  value
) {
  const text =
    String(
      value ??
      ''
    )
      .trim();


  return text ||
    'غير محدد';
}


function parseIntakeTripStops(
  value
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }


  if (
    !value
  ) {
    return [];
  }


  try {
    const parsed =
      JSON.parse(
        value
      );


    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch (
    error
  ) {
    console.warn(
      '[Trip Stops]',
      error
    );


    return [];
  }
}


function intakeTransportLabel(
  value
) {
  const labels = {
    best:
      'الأفضل حسب المسافة',

    domestic_flight:
      'طيران داخلي',

    private_car:
      'سيارة خاصة',

    train:
      'قطار',

    ferry:
      'عبّارة',

    no_preference:
      'بدون تفضيل'
  };


  return labels[
    value
  ] ||
  'غير محدد';
}


function renderIntakeTripStops(
  item
) {
  const cityGroups =
    parseIntakeTripStops(
      item?.trip_stops
    )
      .filter(
        stop =>
          String(
            stop?.city ||
            ''
          ).trim()
      );


  if (
    !cityGroups.length
  ) {
    return '';
  }


  /*
   * نحول المدن + المناطق إلى مسار واحد
   * مرتب كما أدخله العميل.
   */
  const routeStops =
    [];


  cityGroups.forEach(
    (
      stop,
      cityIndex
    ) => {
      const city =
        String(
          stop?.city ||
          ''
        ).trim();


      if (
        !city
      ) {
        return;
      }


      const areas =
        Array.isArray(
          stop?.areas
        )
          ? stop.areas
          : [];


      const cityStopType =
        stop?.stopType ===
          'pass_through'
          ? 'pass_through'
          : 'stay';


      const parsedCityNights =
        Number.parseInt(
          stop?.nights,
          10
        );


      /*
       * إذا كانت المدينة تحتوي مناطق
       * ولم يكن لها عدد ليالٍ فعلي،
       * نعاملها كمجموعة فقط ولا نظهرها
       * كإقامة مستقلة.
       */
      const cityNights =
        Number.isFinite(
          parsedCityNights
        )
          ? Math.max(
              0,
              parsedCityNights
            )
          : (
              areas.length
                ? 0
                : 1
            );


      const shouldIncludeCity =
        cityStopType ===
          'pass_through' ||
        cityNights > 0;


      if (
        shouldIncludeCity
      ) {
        routeStops.push({
          name:
            city,

          parentCity:
            '',

          stopType:
            cityStopType,

          nights:
            cityStopType ===
              'pass_through'
              ? 0
              : cityNights,

          transportToNext:
            String(
              stop
                ?.transportToNext ||
              'best'
            ).trim(),

          cityIndex,

          areaIndex:
            -1
        });
      }


      areas.forEach(
        (
          areaItem,
          areaIndex
        ) => {
          const area =
            String(
              areaItem?.area ||
              areaItem?.name ||
              ''
            ).trim();


          if (
            !area
          ) {
            return;
          }


          const stopType =
            areaItem?.stopType ===
              'pass_through'
              ? 'pass_through'
              : 'stay';


          const parsedAreaNights =
            Number.parseInt(
              areaItem?.nights,
              10
            );


          const areaNights =
            stopType ===
              'pass_through'
              ? 0
              : (
                  Number.isFinite(
                    parsedAreaNights
                  )
                    ? Math.max(
                        1,
                        parsedAreaNights
                      )
                    : 1
                );


          routeStops.push({
            name:
              area,

            parentCity:
              city,

            stopType,

            nights:
              areaNights,

            transportToNext:
              String(
                areaItem
                  ?.transportToNext ||
                areaItem
                  ?.transport ||
                'best'
              ).trim(),

            cityIndex,

            areaIndex
          });
        }
      );
    }
  );


  if (
    !routeStops.length
  ) {
    return '';
  }


  return `
    <div class="client-intake-route">

      <strong class="client-intake-route-title">
        مسار الرحلة
      </strong>


      <div class="client-intake-route-list">

        ${routeStops
          .map(
            (
              stop,
              index
            ) => {
              const nextStop =
                routeStops[
                  index + 1
                ];


              const displayName =
                stop.parentCity &&
                stop.parentCity !==
                  stop.name
                  ? `${stop.name} - ${stop.parentCity}`
                  : stop.name;


              const nextDisplayName =
                nextStop
                  ? (
                      nextStop.parentCity &&
                      nextStop.parentCity !==
                        nextStop.name
                        ? `${nextStop.name} - ${nextStop.parentCity}`
                        : nextStop.name
                    )
                  : '';


              const isPassThrough =
                stop.stopType ===
                  'pass_through';


              const nightsLabel =
                isPassThrough
                  ? 'عبور فقط'
                  : `${
                      stop.nights
                    } ${
                      Number(
                        stop.nights
                      ) === 1
                        ? 'ليلة'
                        : 'ليال'
                    }`;


              return `
                <div class="client-intake-route-stop">

                  <div class="client-intake-route-city">

                    <span class="client-intake-route-number">
                      ${index + 1}
                    </span>

                    <strong>
                      ${escapeHtml(
                        displayName
                      )}
                    </strong>

                    <small>
                      ${escapeHtml(
                        nightsLabel
                      )}
                    </small>

                  </div>


                  ${
                    nextStop
                      ? `
                        <div class="client-intake-route-transfer">

                          <span>
                            الانتقال إلى
                            ${escapeHtml(
                              nextDisplayName
                            )}
                          </span>

                          <strong>
                            ${escapeHtml(
                              intakeTransportLabel(
                                stop.transportToNext
                              )
                            )}
                          </strong>

                        </div>
                      `
                      : ''
                  }

                </div>
              `;
            }
          )
          .join('')}

      </div>

    </div>
  `;
}


function renderClientIntakes(
  items
) {
  currentClientIntakes =
    Array.isArray(items)
      ? items
      : [];


  const list =
    $('#clientIntakesList');


  if (
    !list
  ) {
    return;
  }


  if (
    !Array.isArray(
      items
    ) ||
    !items.length
  ) {
    list.innerHTML = `
      <div class="client-intake-empty">
        لا توجد طلبات مطابقة
      </div>
    `;


    return;
  }


  list.innerHTML =
    items
      .map(
        item => `
          <article
            class="client-intake-card"
            data-intake-id="${escapeHtml(item.id || '')}"
          >

            <div class="client-intake-card-top">

              <div>
                <h3>
                  ${escapeHtml(
                    intakeValue(
                      item.client_name
                    )
                  )}
                </h3>

                <div class="client-intake-code">
                  ${escapeHtml(
                    intakeValue(
                      item.public_code
                    )
                  )}
                </div>
              </div>

              <span class="client-intake-code">
                ${escapeHtml(
                  item.status ===
                    'imported'
                    ? 'تم الاستيراد'
                    : 'طلب جديد'
                )}
              </span>

            </div>
<div class="client-intake-meta-item">
  <strong>
    تاريخ الطلب:
  </strong>

  ${escapeHtml(
    formatIntakeCreatedAt(
      item.created_at
    )
  )}
</div>

              <div class="client-intake-meta-item">
                <strong>
                  الجوال:
                </strong>

                ${escapeHtml(
                  intakeValue(
                    item.phone
                  )
                )}
              </div>


              <div class="client-intake-meta-item">
                <strong>
                  البريد:
                </strong>

                ${escapeHtml(
                  intakeValue(
                    item.email
                  )
                )}
              </div>


              <div class="client-intake-meta-item">
                <strong>
                  من:
                </strong>

                ${escapeHtml(
                  intakeValue(
                    item.origin
                  )
                )}
              </div>


              <div class="client-intake-meta-item">
                <strong>
                  إلى:
                </strong>

                ${escapeHtml(
                  intakeValue(
                    item.destination
                  )
                )}
              </div>


              <div class="client-intake-meta-item">
                <strong>
                  السفر:
                </strong>

                ${escapeHtml(
                  formatIntakeDate(
                    item.start_date
                  )
                )}
              </div>


              <div class="client-intake-meta-item">
                <strong>
                  العودة:
                </strong>

                ${escapeHtml(
                  formatIntakeDate(
                    item.end_date
                  )
                )}
              </div>


              <div class="client-intake-meta-item">
  <strong>
    المسافرون:
  </strong>

  ${escapeHtml(
    String(
      item.adults ??
      1
    )
  )}
  بالغ

  ${Number(
    item.children ||
    0
  ) > 0
    ? `، ${escapeHtml(
        String(
          item.children
        )
      )} طفل`
    : ''
  }
</div>


${
  item.child_ages
    ? `
      <div class="client-intake-meta-item">
        <strong>
          أعمار الأطفال:
        </strong>

        ${escapeHtml(
          String(
            item.child_ages
          )
            .split(',')
            .map(
              age =>
                `${age.trim()} سنة`
            )
            .join('، ')
        )}
      </div>
    `
    : ''
}


              <div class="client-intake-meta-item">
                <strong>
                  الميزانية:
                </strong>

                ${escapeHtml(
                  intakeValue(
                    item.budget
                  )
                )}
              </div>
<div class="client-intake-meta-item">
  <strong>
    تصنيف الفندق:
  </strong>

  ${
    item.hotel_stars
      ? `${escapeHtml(
          String(
            item.hotel_stars
          )
        )} نجوم`
      : 'غير محدد'
  }
</div>


<div class="client-intake-meta-item">
  <strong>
    درجة الطيران:
  </strong>

  ${escapeHtml(
    intakeValue(
      item.flight_class
    )
  )}
</div>


<div class="client-intake-meta-item">
  <strong>
    نوع الرحلة:
  </strong>

  ${escapeHtml(
    intakeValue(
      item.trip_style
    )
  )}
</div>
            </div>

                        ${renderIntakeTripStops(
              item
            )}

            ${
              item.notes
                ? `
                  <div class="client-intake-notes">
                    ${escapeHtml(
                      item.notes
                    )}
                  </div>
                `
                : ''
            }


            <div class="client-intake-actions">

  <button
  type="button"
  class="btn btn-primary import-client-intake-btn ${
    item.status === 'imported'
      ? 'is-imported'
      : ''
  }"
  data-intake-id="${escapeHtml(item.id || '')}"
  data-imported="${item.status === 'imported' ? 'true' : 'false'}"
>
  ${
    item.status === 'imported'
      ? `
        <span class="imported-normal-label">
          تم الاستيراد
        </span>

        <span class="imported-hover-label">
          إعادة الاستيراد؟
        </span>
      `
      : 'استيراد إلى عرض جديد'
  }
</button>


  <button
    type="button"
    class="btn btn-ghost delete-client-intake-btn"
    data-intake-id="${escapeHtml(item.id || '')}"
  >
    حذف الطلب
  </button>

</div>

          </article>
        `
      )
      .join('');
}


async function loadClientIntakes(
  query = ''
) {
  const key =
    getIntakesAdminKey();


  if (
    !key
  ) {
    setClientIntakesStatus(
      'لم يتم إدخال مفتاح الإدارة',
      'error'
    );


    return;
  }


  const list =
    $('#clientIntakesList');


  if (
    list
  ) {
    list.innerHTML =
      '';
  }


  setClientIntakesStatus(
    'جاري تحميل الطلبات...'
  );


  const url =
    new URL(
      CLIENT_INTAKES_ENDPOINT
    );


  const cleanQuery =
    String(
      query ||
      ''
    )
      .trim();


  if (
    cleanQuery
  ) {
    url.searchParams.set(
      'q',
      cleanQuery
    );
  }
const statusFilter =
  $('#clientIntakesStatusFilter')
    ?.value ||
  'all';


if (
  statusFilter !==
    'all'
) {
  url.searchParams.set(
    'status',
    statusFilter
  );
}

  try {
    const response =
      await fetch(
        url.toString(),
        {
          method:
            'GET',

          headers: {
            'X-Admin-Key':
              key
          }
        }
      );


    let result;


    try {
      result =
        await response.json();
    } catch {
      throw new Error(
        'استجابة الخادم غير صالحة'
      );
    }


    if (
      response.status ===
        401
    ) {
      sessionStorage.removeItem(
        'konooz-intakes-admin-key'
      );


      throw new Error(
        'مفتاح الإدارة غير صحيح'
      );
    }


    if (
      !response.ok
    ) {
      throw new Error(
        result?.error ||
        'تعذر تحميل الطلبات'
      );
    }


    renderClientIntakes(
  result.results ||
  []
);


    setClientIntakesStatus(
      ''
    );
  } catch (
    error
  ) {
    console.error(
      '[Client Intakes]',
      error
    );


    renderClientIntakes(
      []
    );


    setClientIntakesStatus(
      error?.message ||
      'تعذر تحميل الطلبات',
      'error'
    );
  }
}


$('#clientIntakesBtn')
  ?.addEventListener(
    'click',
    () => {
      const dialog =
        $('#clientIntakesDialog');


      dialog?.showModal();


      loadClientIntakes(
        $('#clientIntakesSearch')
          ?.value ||
        ''
      );
    }
  );


$('#closeClientIntakesBtn')
  ?.addEventListener(
    'click',
    () => {
      $('#clientIntakesDialog')
        ?.close();
    }
  );
$('#changeClientIntakesKeyBtn')
  ?.addEventListener(
    'click',
    () => {
      const storageKey =
        'konooz-intakes-admin-key';


      const oldKey =
        sessionStorage.getItem(
          storageKey
        ) ||
        '';


      sessionStorage.removeItem(
        storageKey
      );


      const newKey =
        getIntakesAdminKey();


      if (
        !newKey
      ) {
        if (
          oldKey
        ) {
          sessionStorage.setItem(
            storageKey,
            oldKey
          );
        }


        setClientIntakesStatus(
          'لم يتم تغيير كلمة السر'
        );


        return;
      }


      setClientIntakesStatus(
        'جاري التحقق من كلمة السر الجديدة...'
      );


      loadClientIntakes(
        $('#clientIntakesSearch')
          ?.value ||
        ''
      );
    }
  );

$('#clientIntakesStatusFilter')
  ?.addEventListener(
    'change',
    () => {
      loadClientIntakes(
        $('#clientIntakesSearch')
          ?.value ||
        ''
      );
    }
  );


$('#clientIntakesSearch')
  ?.addEventListener(
    'keydown',
    event => {
      if (
        event.key !==
          'Enter'
      ) {
        return;
      }


      event.preventDefault();


      loadClientIntakes(
        event.currentTarget.value
      );
    }
  );
  $('#clientIntakesSearch')
  ?.addEventListener(
    'input',
    event => {
      clearTimeout(
        clientIntakesSearchTimer
      );


      const query =
        event.currentTarget.value;


      clientIntakesSearchTimer =
        setTimeout(
          () => {
            loadClientIntakes(
              query
            );
          },
          400
        );
    }
  );
  function setFormFieldValue(
  selector,
  value
) {
  const element =
    $(selector);


  if (
    !element
  ) {
    return;
  }


  element.value =
    value ??
    '';


  element.dispatchEvent(
    new Event(
      'input',
      {
        bubbles:
          true
      }
    )
  );


  element.dispatchEvent(
    new Event(
      'change',
      {
        bubbles:
          true
      }
    )
  );
}


function buildIntakeNotes(
  intake
) {
  const parts = [];


  if (
    intake.public_code
  ) {
    parts.push(
      `رقم طلب العميل: ${intake.public_code}`
    );
  }


  if (
    intake.phone
  ) {
    parts.push(
      `الجوال: ${intake.phone}`
    );
  }


  if (
    intake.email
  ) {
    parts.push(
      `البريد الإلكتروني: ${intake.email}`
    );
  }


  if (
    intake.origin
  ) {
    parts.push(
      `مدينة المغادرة: ${intake.origin}`
    );
  }


  if (
    intake.destination
  ) {
    parts.push(
      `الوجهة: ${intake.destination}`
    );
  }


  if (
    intake.start_date
  ) {
    parts.push(
      `تاريخ السفر: ${intake.start_date}`
    );
  }


  if (
    intake.end_date
  ) {
    parts.push(
      `تاريخ العودة: ${intake.end_date}`
    );
  }


  const adults =
    Number(
      intake.adults ||
      0
    );


  const children =
    Number(
      intake.children ||
      0
    );


  if (
    adults > 0 ||
    children > 0
  ) {
    const travelers = [];


    if (
      adults > 0
    ) {
      travelers.push(
        `${adults} بالغ`
      );
    }


    if (
      children > 0
    ) {
      travelers.push(
        `${children} طفل`
      );
    }


    parts.push(
      `المسافرون: ${travelers.join('، ')}`
    );
  }


  if (
    intake.budget
  ) {
    parts.push(
      `الميزانية التقريبية: ${intake.budget}`
    );
  }


  if (
    intake.hotel_stars
  ) {
    parts.push(
      `تصنيف الفندق المطلوب: ${intake.hotel_stars} نجوم`
    );
  }


  if (
    intake.flight_class
  ) {
    parts.push(
      `درجة الطيران: ${intake.flight_class}`
    );
  }


  if (
    intake.trip_style
  ) {
    parts.push(
      `نوع الرحلة: ${intake.trip_style}`
    );
  }


  if (
    intake.notes
  ) {
    parts.push(
      ''
    );


    parts.push(
      'طلبات وملاحظات العميل:'
    );


    parts.push(
      intake.notes
    );
  }


  return parts.join(
    '\n'
  );
}


async function markClientIntakeImported(
  intakeId
) {
  const key =
    getIntakesAdminKey();


  if (
    !key ||
    !intakeId
  ) {
    return;
  }


  try {
    await fetch(
      `${CLIENT_INTAKES_ENDPOINT}/${encodeURIComponent(intakeId)}/imported`,
      {
        method:
          'POST',

        headers: {
          'X-Admin-Key':
            key
        }
      }
    );
  } catch (
    error
  ) {
    console.error(
      '[Mark Intake Imported]',
      error
    );
  }
}

async function deleteClientIntake(
  intake
) {
  if (
    !intake?.id
  ) {
    throw new Error(
      'بيانات الطلب غير صالحة'
    );
  }


  const key =
    getIntakesAdminKey();


  if (
    !key
  ) {
    throw new Error(
      'لم يتم إدخال مفتاح الإدارة'
    );
  }


  const response =
    await fetch(
      `${CLIENT_INTAKES_ENDPOINT}/${encodeURIComponent(intake.id)}/delete`,
      {
        method:
          'POST',

        headers: {
          'X-Admin-Key':
            key
        }
      }
    );


  let result;


  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      'استجابة الخادم غير صالحة'
    );
  }


  if (
    response.status ===
      401
  ) {
    sessionStorage.removeItem(
      'konooz-intakes-admin-key'
    );


    throw new Error(
      'مفتاح الإدارة غير صحيح'
    );
  }


  if (
    !response.ok
  ) {
    throw new Error(
      result?.error ||
      'تعذر حذف الطلب'
    );
  }


  return true;
}

function tripStopTransitionDate(
  startDate,
  nightsBeforeTransition
) {
  const date =
    new Date(
      `${startDate}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }


  date.setDate(
    date.getDate() +
    nightsBeforeTransition
  );


  const iso =
    [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      ),
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      )
    ].join('-');


  const parsed =
    parseFlexibleDate(
      iso
    );


  return parsed.valid
    ? parsed.display
    : '';
}


function addTripStopTransportServices(
  intake,
  tripStops
) {
  if (
    !Array.isArray(
      tripStops
    ) ||
    tripStops.length <
      2
  ) {
    return;
  }


  const travelerCount =
    Math.max(
      1,
      Number(
        intake.adults ||
        1
      ) +
      Number(
        intake.children ||
        0
      )
    );


  const flightClass =
    String(
      intake.flight_class ||
      ''
    )
      .trim()
      .replace(
        /^درجة\s+/,
        ''
      );


  const domesticSegments =
    [];


  let elapsedNights =
    0;


  for (
    let index = 0;
    index < tripStops.length - 1;
    index += 1
  ) {
    const currentStop =
      tripStops[index];


    const nextStop =
      tripStops[
        index + 1
      ];


    const currentStopType =
  currentStop?.stopType ===
    'pass_through'
    ? 'pass_through'
    : 'stay';


const parsedCurrentNights =
  Number.parseInt(
    currentStop?.nights,
    10
  );


const currentStopNights =
  currentStopType ===
    'pass_through'
    ? 0
    : (
        Number.isFinite(
          parsedCurrentNights
        )
          ? Math.max(
              0,
              parsedCurrentNights
            )
          : 1
      );


elapsedNights +=
  currentStopNights;


    const transitionDate =
      tripStopTransitionDate(
        intake.start_date ||
        '',
        elapsedNights
      );


    const transport =
      String(
        currentStop
          .transportToNext ||
        'best'
      ).trim();


    if (
      transport ===
        'domestic_flight'
    ) {
      domesticSegments.push(
        createSegment(
          currentStop.city,
          nextStop.city,
          transitionDate,
          '',
          '',
          '',
          0,
          ''
        )
      );


      continue;
    }


    const transportLabels = {
  private_car:
    'سيارة خاصة',

  train:
    'قطار',

  ferry:
    'عبّارة',

  boat:
    'قارب',

  shared_transfer:
    'نقل مشترك',

  best:
    'الأفضل حسب المسافة',

  no_preference:
    'بدون تفضيل'
};


    const details =
      transportLabels[
        transport
      ] ||
      'تنقل بين المدن';


    state.services.push({
      id:
        `service-${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

      category:
        'transfer',

      name:
        `تنقل ${currentStop.city} إلى ${nextStop.city}`,

      details:
        transitionDate
          ? `${details} | ${transitionDate}`
          : details,

      costMode:
        'total',

      qty:
        1,

      cost:
        0
    });
  }


  if (
    domesticSegments.length
  ) {
    state.services.push({
      id:
        `service-${Date.now()}-domestic-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

      category:
        'flight',

      name:
  'تذاكر الطيران الداخلي',

flightType:
  'domestic',

details:
        flightClass
          ? `درجة ${flightClass}`
          : '',

      costMode:
        'total',

      qty:
        travelerCount,

      cost:
        0,

      segments:
        domesticSegments
    });
  }
}


function addTripStopHotelServices(
  intake,
  tripStops
) {
  if (
    !Array.isArray(
      tripStops
    ) ||
    !tripStops.length
  ) {
    return;
  }


  if (
    !Array.isArray(
      state.services
    )
  ) {
    state.services = [];
  }


  if (
    !Array.isArray(
      state.hotelCities
    )
  ) {
    state.hotelCities = [];
  }


  const rawStartDate =
    String(
      intake?.start_date ||
      ''
    ).trim();


  const dateParts =
    rawStartDate
      .split('-')
      .map(
        value =>
          Number(
            value
          )
      );


  if (
    dateParts.length !== 3 ||
    !dateParts[0] ||
    !dateParts[1] ||
    !dateParts[2]
  ) {
    console.warn(
      '[Trip hotels] تاريخ البداية غير صالح:',
      rawStartDate
    );

    return;
  }


  const [
    startYear,
    startMonth,
    startDay
  ] = dateParts;


  function dateAfterNights(
    nights
  ) {
    const date =
      new Date(
        startYear,
        startMonth - 1,
        startDay
      );


    date.setDate(
      date.getDate() +
      nights
    );


    const iso =
      [
        date.getFullYear(),

        String(
          date.getMonth() + 1
        ).padStart(
          2,
          '0'
        ),

        String(
          date.getDate()
        ).padStart(
          2,
          '0'
        )
      ].join('-');


    const parsed =
      parseFlexibleDate(
        iso
      );


    return parsed.valid
      ? parsed.display
      : iso;
  }


  const hotelStars =
    String(
      intake?.hotel_stars ||
      ''
    ).trim();


  const newHotels = [];


  let elapsedNights =
    0;


  tripStops.forEach(
    (
      stop,
      index
    ) => {
      const city =
        String(
          stop?.city ||
          ''
        ).trim();


      if (
        !city
      ) {
        return;
      }


      const nights =
        Math.max(
          1,
          Number.parseInt(
            stop?.nights,
            10
          ) ||
          1
        );


      const checkIn =
        dateAfterNights(
          elapsedNights
        );


      const checkOut =
        dateAfterNights(
          elapsedNights +
          nights
        );


      const detailsParts = [
        `${nights} ${
          nights === 1
            ? 'ليلة'
            : 'ليال'
        }`
      ];


      if (
        hotelStars
      ) {
        detailsParts.push(
          `${hotelStars} نجوم`
        );
      }


      const hotelService = {
        id:
          `service-${Date.now()}-hotel-${index}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,

        category:
          'hotel',

        city,

        name:
          `فندق في ${city}`,

        details:
          detailsParts.join(
            ' | '
          ),

        checkIn,

        checkInTime:
          '3:00 PM',

        checkOut,

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          1,

        cost:
          0,

        tripStopIndex:
          index
      };


      newHotels.push(
        hotelService
      );


      elapsedNights +=
        nights;
    }
  );


  state.services.push(
    ...newHotels
  );


  state.hotelCities = [
    ...new Set([
      ...state.hotelCities,

      ...newHotels.map(
        hotel =>
          hotel.city
      )
    ])
  ];


  console.log(
    '[Trip hotels] تمت إضافة الفنادق:',
    newHotels
  );
}


async function importClientIntake(
  intake
) {
  if (
    !intake
  ) {
    return;
  }


  startNewOffer(
    true
  );


  setFormFieldValue(
    '#clientName',
    intake.client_name
  );


  setFormFieldValue(
    '#origin',
    intake.origin
  );


  setFormFieldValue(
    '#destination',
    intake.destination
  );


  setFormFieldValue(
    '#startDate',
    intake.start_date
  );


  setFormFieldValue(
    '#endDate',
    intake.end_date
  );


  setFormFieldValue(
    '#adults',
    intake.adults ??
    1
  );


  setFormFieldValue(
    '#children',
    intake.children ??
    0
  );

const importedChildAges =
  String(
    intake.child_ages ||
    ''
  )
    .split(',')
    .map(
      age =>
        Number.parseInt(
          age.trim(),
          10
        )
    )
    .filter(
      age =>
        Number.isFinite(age)
    );


if (
  Array.isArray(
    state.childAges
  )
) {
  state.childAges =
    importedChildAges;
}


const importedTripStops =
  parseIntakeTripStops(
    intake.trip_stops
  )
    .flatMap(
      (
        stop,
        cityIndex
      ) => {
        const parentCity =
          String(
            stop?.city ||
            ''
          ).trim();


        if (
          !parentCity
        ) {
          return [];
        }


        const rawAreas =
          Array.isArray(
            stop?.areas
          )
            ? stop.areas
            : [];


        /*
         * نوع المدينة الأساسية:
         *
         * stay
         * = إقامة فعلية
         *
         * group
         * = مجرد مجموعة للمناطق
         *   مثل بالي
         *
         * pass_through
         * = محطة مرور فعلية
         *   بدون إقامة
         */
        const rawParentStopType =
          String(
            stop?.stopType ||
            ''
          ).trim();


        const parsedParentNights =
          Number.parseInt(
            stop?.nights,
            10
          );


        /*
         * دعم الطلبات القديمة:
         * إذا لم يكن stopType موجودًا،
         * وكانت المدينة تحتوي مناطق
         * وليالي المدينة 0،
         * نعتبرها مجموعة مناطق.
         */
        const parentStopType =
          [
            'stay',
            'group',
            'pass_through'
          ].includes(
            rawParentStopType
          )
            ? rawParentStopType
            : (
                rawAreas.length &&
                (
                  !Number.isFinite(
                    parsedParentNights
                  ) ||
                  parsedParentNights <= 0
                )
                  ? 'group'
                  : 'stay'
              );


        const parentNights =
          parentStopType ===
            'stay'
            ? (
                Number.isFinite(
                  parsedParentNights
                )
                  ? Math.max(
                      1,
                      parsedParentNights
                    )
                  : 1
              )
            : 0;


        /*
         * نحول مناطق المدينة إلى محطات
         * فعلية بالترتيب.
         */
        const areas =
  rawAreas
    .map(
      (
        areaItem,
        areaIndex
      ) => {
        const area =
          String(
            areaItem?.area ||
            areaItem?.name ||
            ''
          ).trim();


        if (
          !area
        ) {
          return null;
        }


        const stopType =
          areaItem?.stopType ===
            'pass_through'
            ? 'pass_through'
            : 'stay';


        const parsedNights =
          Number.parseInt(
            areaItem?.nights,
            10
          );


        const nights =
          stopType ===
            'pass_through'
            ? 0
            : Math.max(
                1,
                Number.isFinite(
                  parsedNights
                )
                  ? parsedNights
                  : 1
              );


        return {
          city:
            area,

          parentCity,

          area,

          parentCityIndex:
            cityIndex,

          tripAreaIndex:
            areaIndex,

          stopType,

          nights,

          transportToNext:
            String(
              areaItem
                ?.transportToNext ||
              areaItem
                ?.transport ||
              'best'
            ).trim()
        };
      }
    )
    .filter(
      Boolean
    );


        /*
         * مدينة من نوع group:
         *
         * لا نضيف المدينة نفسها للمسار.
         * نضيف مناطقها فقط.
         *
         * مثال:
         * بالي لا تصبح محطة مستقلة،
         * لكن أوبود ونوسا دوا وأولواتو
         * تدخل المسار.
         */
        if (
  parentStopType ===
    'group'
) {
  if (
    !areas.length
  ) {
    return [];
  }


  const groupExitTransport =
    String(
      stop?.transportToNext ||
      'best'
    ).trim() ||
    'best';


  return areas.map(
    (
      areaStop,
      areaIndex
    ) => {
      const isLastArea =
        areaIndex ===
          areas.length - 1;


      if (
        !isLastArea
      ) {
        return areaStop;
      }


      return {
        ...areaStop,

        /*
         * وسيلة النقل الموجودة في بطاقة
         * المدينة الأساسية تستخدم بعد
         * آخر منطقة داخل المجموعة.
         */
        transportToNext:
          groupExitTransport
      };
    }
  );
}


        /*
         * المدينة نفسها محطة فعلية:
         * إما إقامة أو عبور.
         */
        const parentStop = {
          city:
            parentCity,

          parentCity:
            '',

          area:
            '',

          parentCityIndex:
            cityIndex,

          tripAreaIndex:
            -1,

          stopType:
            parentStopType,

          nights:
            parentNights,

          transportToNext:
            String(
              stop?.transportToNext ||
              'best'
            ).trim()
        };


        /*
         * إذا كان للمدينة مناطق،
         * نضع المدينة أولًا ثم المناطق.
         */
        if (
          areas.length
        ) {
          return [
            parentStop,
            ...areas
          ];
        }


        return [
          parentStop
        ];
      }
    )
    .filter(
      stop =>
        stop.city
    );


state.tripStops =
  importedTripStops;


const importedHotelCities =
  importedTripStops
    .filter(
      stop => {
        const stopType =
          stop?.stopType ===
            'pass_through'
            ? 'pass_through'
            : 'stay';


        const parsedNights =
          Number.parseInt(
            stop?.nights,
            10
          );


        return (
          stopType ===
            'stay' &&
          Number.isFinite(
            parsedNights
          ) &&
          parsedNights > 0
        );
      }
    )
    .map(
      stop =>
        String(
          stop?.city ||
          ''
        ).trim()
    )
    .filter(
      Boolean
    );


state.hotelCities = [
  ...new Set([
    ...(
      Array.isArray(
        state.hotelCities
      )
        ? state.hotelCities
        : []
    ),

    ...importedHotelCities
  ])
];


if (
  intake.flight_class
) {
  const origin =
    String(
      intake.origin ||
      ''
    ).trim();


  const destination =
    String(
      intake.destination ||
      ''
    ).trim();


  const parsedStartDate =
  parseFlexibleDate(
    intake.start_date ||
    ''
  );


const parsedEndDate =
  parseFlexibleDate(
    intake.end_date ||
    ''
  );


const startDate =
  parsedStartDate.valid
    ? parsedStartDate.display
    : '';


const endDate =
  parsedEndDate.valid
    ? parsedEndDate.display
    : '';


  const existingFlightIndex =
    state.services.findIndex(
      service =>
        service.category ===
        'flight'
    );


  const flightService = {
    id:
      `service-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,

    category:
      'flight',

    name:
  'تذاكر الطيران الدولي',

details:
  String(
    intake.flight_class ||
    ''
  )
    .trim()
    .replace(
      /^درجة\s+/,
      ''
    )
    ? `درجة ${String(
        intake.flight_class
      )
        .trim()
        .replace(
          /^درجة\s+/,
          ''
        )}`
    : '',

    costMode:
      'total',

    qty:
      Math.max(
        1,
        Number(
          intake.adults ||
          1
        ) +
        Number(
          intake.children ||
          0
        )
      ),

    cost:
      0,

    segments: [
      createSegment(
        origin,
        destination,
        startDate,
        '',
        '',
        '',
        0,
        ''
      ),

      createSegment(
        destination,
        origin,
        endDate,
        '',
        '',
        '',
        0,
        ''
      )
    ]
  };


  if (
    existingFlightIndex >=
      0
  ) {
    state.services[
      existingFlightIndex
    ] =
      flightService;
  } else {
    state.services.push(
  flightService
);


addTripStopTransportServices(
  intake,
  importedTripStops
);


let hotelElapsedNights =
  0;


const hotelTravelerCount =
  Math.max(
    1,
    Number(
      intake.adults ||
      0
    ) +
    Number(
      intake.children ||
      0
    )
  );


importedTripStops.forEach(
  (
    stop,
    index
  ) => {
    const city =
      String(
        stop?.city ||
        ''
      ).trim();


    if (
      !city
    ) {
      return;
    }


    const stopType =
      stop?.stopType ===
        'pass_through'
        ? 'pass_through'
        : 'stay';


    const parsedNights =
      Number.parseInt(
        stop?.nights,
        10
      );


    const nights =
      stopType ===
        'pass_through'
        ? 0
        : (
            Number.isFinite(
              parsedNights
            )
              ? Math.max(
                  1,
                  parsedNights
                )
              : 1
          );


    /*
     * تاريخ الوصول إلى هذه المحطة يعتمد
     * على مجموع ليالي المحطات السابقة فقط.
     *
     * محطة العبور = 0 ليلة،
     * لذلك لا تغير التاريخ.
     */
    const checkIn =
      tripStopTransitionDate(
        intake.start_date,
        hotelElapsedNights
      );


    /*
     * عبور فقط:
     * لا ننشئ فندقًا.
     * نتركها في المسار ونكمل للمحطة التالية.
     */
    if (
      stopType ===
        'pass_through'
    ) {
      hotelElapsedNights +=
        nights;

      return;
    }


    const checkOut =
      tripStopTransitionDate(
        intake.start_date,
        hotelElapsedNights +
          nights
      );


    state.services.push({
      id:
        `hotel-${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

      category:
        'hotel',

      city,

      name:
        `فندق في ${city}`,

      details:
        intake.hotel_stars
          ? `${nights} ${
              nights === 1
                ? 'ليلة'
                : 'ليال'
            } | ${intake.hotel_stars} نجوم`
          : `${nights} ${
              nights === 1
                ? 'ليلة'
                : 'ليال'
            }`,

      checkIn,

      checkInTime:
        '3:00 PM',

      checkOut,

      checkOutTime:
        '12:00 PM',

      hotelTax:
        0,

      costMode:
        'total',

      qty:
        hotelTravelerCount,

      cost:
        0,

      /*
       * مهم جدًا:
       * نحافظ على رقم المحطة الأصلي
       * في المسار الكامل.
       */
      tripStopIndex:
        index
    });


    /*
     * بعد انتهاء إقامة هذه المحطة
     * ننتقل بالتاريخ للمحطة التالية.
     */
    hotelElapsedNights +=
      nights;
  }
);


renderAll();
  }
}


  if (
  intake.hotel_stars
) {
  const hotelStarsField =
    $('#hotelStars');


  if (
    hotelStarsField
  ) {
    const wanted =
      String(
        intake.hotel_stars
      )
        .trim();


    const matchingOption =
      [
        ...hotelStarsField.options
      ]
        .find(
          option =>
            String(
              option.value
            )
              .trim() ===
              wanted ||
            String(
              option.textContent
            )
              .trim()
              .includes(
                wanted
              )
        );


    if (
      matchingOption
    ) {
      hotelStarsField.value =
        matchingOption.value;


      hotelStarsField.dispatchEvent(
        new Event(
          'change',
          {
            bubbles:
              true
          }
        )
      );
    }
  }
}
  const notes =
    buildIntakeNotes(
      intake
    );


  const notesField =
  $('#internalNotes');


  if (
    notesField &&
    notes
  ) {
    notesField.value =
      notes;


    notesField.dispatchEvent(
      new Event(
        'input',
        {
          bubbles:
            true
        }
      )
    );
  }


  if (
  typeof renderAll ===
    'function'
) {
  renderAll();
}


  if (
    typeof updateActiveOfferStatus ===
      'function'
  ) {
    updateActiveOfferStatus();
  }


  if (
    typeof saveDraft ===
      'function'
  ) {
    saveDraft(
      true
    );
  }


  await markClientIntakeImported(
    intake.id
  );


  $('#clientIntakesDialog')
    ?.close();


  if (
    typeof toast ===
      'function'
  ) {
    toast(
      'تم استيراد طلب العميل إلى عرض جديد'
    );
  }
}

function confirmClientIntakeReimport(
  intake
) {
  return new Promise(
    resolve => {
      const oldDialog =
        document.querySelector(
          '#reimportClientIntakeConfirmDialog'
        );


      oldDialog?.remove();


      const clientName =
        String(
          intake?.client_name ||
          'هذا العميل'
        ).trim();


      const code =
        String(
          intake?.public_code ||
          ''
        ).trim();


      const dialog =
        document.createElement(
          'dialog'
        );


      dialog.id =
        'reimportClientIntakeConfirmDialog';


      dialog.style.cssText = `
        width: min(440px, calc(100% - 30px));
        padding: 0;
        border: 0;
        border-radius: 18px;
        background: transparent;
      `;


      dialog.innerHTML = `
        <div
          style="
            padding: 24px;
            border-radius: 18px;
            background: #fff;
            box-shadow: 0 25px 70px rgba(0,0,0,.20);
            text-align: right;
          "
        >

          <h3
            style="
              margin: 0 0 10px;
              color: #173f36;
              font-size: 18px;
            "
          >
            إعادة استيراد الطلب
          </h3>


          <p
            style="
              margin: 0;
              color: #667a74;
              line-height: 1.9;
              font-size: 13px;
            "
          >
            هل تريد إعادة استيراد طلب
            <strong>
              ${escapeHtml(clientName)}
            </strong>

            ${
              code
                ? `
                  <br>

                  <span
                    style="
                      color: #b78a32;
                      font-weight: 800;
                    "
                  >
                    ${escapeHtml(code)}
                  </span>
                `
                : ''
            }
            ؟
          </p>


          <p
            style="
              margin: 10px 0 0;
              color: #667a74;
              font-size: 11px;
              line-height: 1.8;
            "
          >
            سيتم إنشاء عرض جديد مرة أخرى من بيانات هذا الطلب.
          </p>


          <div
            style="
              margin-top: 20px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            "
          >

            <button
              type="button"
              class="btn btn-ghost"
              data-cancel-reimport
            >
              إلغاء
            </button>


            <button
              type="button"
              class="btn btn-primary"
              data-confirm-reimport
            >
              إعادة الاستيراد
            </button>

          </div>

        </div>
      `;


      document.body.appendChild(
        dialog
      );


      let finished =
        false;


      function finish(
        result
      ) {
        if (
          finished
        ) {
          return;
        }


        finished =
          true;


        if (
          dialog.open
        ) {
          dialog.close();
        }


        dialog.remove();


        resolve(
          result
        );
      }


      dialog
        .querySelector(
          '[data-cancel-reimport]'
        )
        ?.addEventListener(
          'click',
          () => {
            finish(
              false
            );
          },
          {
            once:
              true
          }
        );


      dialog
        .querySelector(
          '[data-confirm-reimport]'
        )
        ?.addEventListener(
          'click',
          () => {
            finish(
              true
            );
          },
          {
            once:
              true
          }
        );


      dialog.addEventListener(
        'cancel',
        event => {
          event.preventDefault();


          finish(
            false
          );
        },
        {
          once:
            true
        }
      );


      dialog.showModal();
    }
  );
}
$('#clientIntakesList')
  ?.addEventListener(
    'click',
    async event => {
      const button =
        event.target.closest(
          '.import-client-intake-btn'
        );
function confirmClientIntakeDelete(
  intake
) {
  return new Promise(
    resolve => {
      const oldDialog =
        document.querySelector(
          '#deleteClientIntakeConfirmDialog'
        );


      oldDialog?.remove();


      const clientName =
        String(
          intake?.client_name ||
          'هذا العميل'
        ).trim();


      const code =
        String(
          intake?.public_code ||
          ''
        ).trim();


      const dialog =
        document.createElement(
          'dialog'
        );


      dialog.id =
        'deleteClientIntakeConfirmDialog';


      dialog.style.cssText = `
        width: min(440px, calc(100% - 30px));
        padding: 0;
        border: 0;
        border-radius: 18px;
        background: transparent;
      `;


      dialog.innerHTML = `
        <div
          style="
            padding: 24px;
            border-radius: 18px;
            background: #fff;
            box-shadow: 0 25px 70px rgba(0,0,0,.20);
            text-align: right;
          "
        >

          <h3
            style="
              margin: 0 0 10px;
              color: #173f36;
              font-size: 18px;
            "
          >
            حذف طلب العميل
          </h3>


          <p
            style="
              margin: 0;
              color: #667a74;
              line-height: 1.9;
              font-size: 13px;
            "
          >
            هل أنت متأكد من حذف طلب
            <strong>
              ${escapeHtml(clientName)}
            </strong>

            ${
              code
                ? `
                  <br>
                  <span
                    style="
                      color: #b78a32;
                      font-weight: 800;
                    "
                  >
                    ${escapeHtml(code)}
                  </span>
                `
                : ''
            }
            ؟
          </p>


          <p
            style="
              margin: 10px 0 0;
              color: #a74848;
              font-size: 11px;
              font-weight: 800;
            "
          >
            لا يمكن التراجع عن الحذف.
          </p>


          <div
            style="
              margin-top: 20px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            "
          >

            <button
              type="button"
              class="btn btn-ghost"
              data-cancel-intake-delete
            >
              إلغاء
            </button>


            <button
              type="button"
              class="btn"
              data-confirm-intake-delete
              style="
                color: #fff;
                background: #a74848;
              "
            >
              حذف الطلب
            </button>

          </div>

        </div>
      `;


      document.body.appendChild(
        dialog
      );


      let finished =
        false;


      function finish(
        result
      ) {
        if (
          finished
        ) {
          return;
        }


        finished =
          true;


        if (
          dialog.open
        ) {
          dialog.close();
        }


        dialog.remove();


        resolve(
          result
        );
      }


      dialog
        .querySelector(
          '[data-cancel-intake-delete]'
        )
        ?.addEventListener(
          'click',
          () => {
            finish(
              false
            );
          },
          {
            once:
              true
          }
        );


      dialog
        .querySelector(
          '[data-confirm-intake-delete]'
        )
        ?.addEventListener(
          'click',
          () => {
            finish(
              true
            );
          },
          {
            once:
              true
          }
        );


      dialog.addEventListener(
        'cancel',
        event => {
          event.preventDefault();


          finish(
            false
          );
        },
        {
          once:
            true
        }
      );


      dialog.showModal();
    }
  );
}


$('#clientIntakesList')
  ?.addEventListener(
    'click',
    async event => {
      const button =
        event.target.closest(
          '.delete-client-intake-btn'
        );


      if (
        !button
      ) {
        return;
      }


      event.preventDefault();
      event.stopImmediatePropagation();


      const intakeId =
        button.dataset.intakeId;


      const intake =
        currentClientIntakes.find(
          item =>
            String(
              item.id
            ) ===
            String(
              intakeId
            )
        );


      if (
        !intake
      ) {
        setClientIntakesStatus(
          'تعذر العثور على بيانات الطلب',
          'error'
        );


        return;
      }


      const confirmed =
        await confirmClientIntakeDelete(
          intake
        );


      if (
        !confirmed
      ) {
        return;
      }


      const originalText =
        button.textContent;


      button.disabled =
        true;


      button.textContent =
        'جاري الحذف...';


      try {
        await deleteClientIntake(
          intake
        );


        await loadClientIntakes(
          $('#clientIntakesSearch')
            ?.value ||
          ''
        );


        toast(
          'تم حذف طلب العميل'
        );
      } catch (
        error
      ) {
        console.error(
          '[Delete Client Intake]',
          error
        );


        button.disabled =
          false;


        button.textContent =
          originalText;


        setClientIntakesStatus(
          error?.message ||
          'تعذر حذف الطلب',
          'error'
        );
      }
    }
  );

      if (
        !button
      ) {
        return;
      }


      const intakeId =
        button.dataset.intakeId;


      const intake =
        currentClientIntakes.find(
          item =>
            String(
              item.id
            ) ===
            String(
              intakeId
            )
        );


      if (
        !intake
      ) {
        setClientIntakesStatus(
          'تعذر العثور على بيانات الطلب',
          'error'
        );


        return;
      }
const alreadyImported =
  button.dataset.imported ===
    'true';


if (
  alreadyImported
) {
  const confirmed =
    await confirmClientIntakeReimport(
      intake
    );


  if (
    !confirmed
  ) {
    return;
  }
}

      button.disabled =
        true;


      button.textContent =
        'جاري الاستيراد...';


      try {
        await importClientIntake(
          intake
        );
      } catch (
        error
      ) {
        console.error(
          '[Import Client Intake]',
          error
        );


        button.disabled =
          false;


        button.textContent =
          'استيراد إلى عرض جديد';


        setClientIntakesStatus(
          'تعذر استيراد الطلب',
          'error'
        );
      }
    }
  );
  /* =========================================================
     WINDOW
     ========================================================= */

  window.addEventListener(
    'scroll',

    () => {
      calculatePreviewButtonVisibility();


      calculateClientBackVisibility();
    },

    {
      passive:
        true
    }
  );


  window.addEventListener(
    'resize',

    () => {
      calculatePreviewButtonVisibility();


      calculateClientBackVisibility();
    }
  );


  window.addEventListener(
    'beforeunload',

    () => {
      clearTimeout(
        autoSaveTimer
      );


      clearTimeout(
        driveSyncTimer
      );


      try {
        if (
          activeOfferId ||
          currentOfferTouched
        ) {
          saveDraft(
            true
          );
        }
      } catch (
        error
      ) {
        console.error(
          '[Before unload]',
          error
        );
      }


      releasePdfPreview();
    }
  );


  /* =========================================================
     RENDER ALL
     ========================================================= */

  function renderAll() {
    ensureStateStructure();


    applyCopy();


    renderChildAges();


    renderServices();


    renderItinerary();


    updateSummary();
  }


  /* =========================================================
     START
     ========================================================= */

  renderAll();


  const existingOfferLoaded =
    loadDraft();


  /*
   * إذا لا يوجد أي عرض محفوظ،
   * أول رقم يبدأ من 0001.
   */
  if (
    !existingOfferLoaded &&
    $('#quoteNumber')
  ) {
    $('#quoteNumber').value =
      getNextQuoteNumber();
  }


  updateActiveOfferStatus();


  updateNewServiceScheduleFields();


  setDriveStatus(
    'disconnected'
  );


  initGoogleDrive()
    .catch(
      error => {
        console.warn(
          '[Google Drive init]',
          error
        );


        setDriveStatus(
          'error',
          'Google Drive غير جاهز'
        );
      }
    );


  requestAnimationFrame(
    () => {
      requestAnimationFrame(
        () => {
          calculatePreviewButtonVisibility();


          calculateClientBackVisibility();
        }
      );
    }
  );
$('#openClientIntakeBtn')
  ?.addEventListener(
    'click',
    () => {
      window.open(
        './intake.html',
        '_blank',
        'noopener'
      );
    }
  );
  function openLunaJsonDialog() {
  const dialog =
    $('#lunaJsonDialog');


  if (
    !dialog
  ) {
    return;
  }


  const status =
    $('#lunaResultsStatus');


  if (
    status
  ) {
    status.hidden =
      true;

    status.textContent =
      '';

    status.classList.remove(
      'is-error',
      'is-success'
    );
  }


  dialog.showModal();


  setTimeout(
    () => {
      $('#lunaResultsJson')
        ?.focus();
    },
    50
  );
}


function closeLunaJsonDialog() {
  const dialog =
    $('#lunaJsonDialog');


  if (
    dialog?.open
  ) {
    dialog.close();
  }
}


function openLunaResultsDialog() {
  const dialog =
    $('#lunaResultsDialog');


  if (
    !dialog
  ) {
    return;
  }


  dialog.showModal();
}


function closeLunaResultsDialog() {
  const dialog =
    $('#lunaResultsDialog');


  if (
    dialog?.open
  ) {
    dialog.close();
  }
}


/*
 * زر "استيراد" في صفحة الخدمات
 * يفتح فقط نافذة لصق JSON.
 */
$('#openLunaResultsBtn')
  ?.addEventListener(
    'click',
    openLunaJsonDialog
  );


$('#closeLunaJsonBtn')
  ?.addEventListener(
    'click',
    closeLunaJsonDialog
  );


$('#cancelLunaJsonBtn')
  ?.addEventListener(
    'click',
    closeLunaJsonDialog
  );


$('#closeLunaResultsBtn')
  ?.addEventListener(
    'click',
    closeLunaResultsDialog
  );


$('#cancelLunaResultsBtn')
  ?.addEventListener(
    'click',
    closeLunaResultsDialog
  );


/*
 * الضغط خارج نافذة JSON يغلقها.
 */
$('#lunaJsonDialog')
  ?.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        event.currentTarget
      ) {
        closeLunaJsonDialog();
      }
    }
  );


/*
 * الضغط خارج نافذة النتائج يغلقها.
 */
$('#lunaResultsDialog')
  ?.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        event.currentTarget
      ) {
        closeLunaResultsDialog();
      }
    }
  );
  function getRequestedFlightClass() {
  const flightService =
    Array.isArray(
      state.services
    )
      ? state.services.find(
          service =>
            service.category ===
            'flight'
        )
      : null;


  return String(
    flightService?.details ||
    'غير محددة'
  ).trim();
}


function buildLunaTravelSearchPrompt() {
  const origin =
    $('#origin')
      ?.value
      ?.trim() ||
    'غير محددة';


  const destination =
    $('#destination')
      ?.value
      ?.trim() ||
    'غير محددة';


  const startDate =
    $('#startDate')
      ?.value ||
    'غير محدد';


  const endDate =
    $('#endDate')
      ?.value ||
    'غير محدد';


  const adults =
    Math.max(
      1,
      Number(
        $('#adults')
          ?.value ||
        1
      )
    );


  const children =
    Math.max(
      0,
      Number(
        $('#children')
          ?.value ||
        0
      )
    );


  const childAges =
    Array.isArray(
      state.childAges
    )
      ? state.childAges
      : [];


  const hotelStars =
    $('#hotelStars')
      ?.value ||
    'غير محدد';


  const flightClass =
    getRequestedFlightClass();


  const internalNotes =
    $('#internalNotes')
      ?.value
      ?.trim() ||
    'لا توجد';


    const budgetMatch =
  internalNotes.match(
    /^الميزانية التقريبية:\s*(.+)$/m
  );


const tripStyleMatch =
  internalNotes.match(
    /^نوع الرحلة:\s*(.+)$/m
  );


const customerNotesMarker =
  'طلبات وملاحظات العميل:';


const customerNotes =
  internalNotes.includes(
    customerNotesMarker
  )
    ? internalNotes
        .split(
          customerNotesMarker
        )
        .slice(1)
        .join(
          customerNotesMarker
        )
        .trim()
    : '';


const budget =
  budgetMatch?.[1]?.trim() ||
  'غير محددة';


const tripStyle =
  tripStyleMatch?.[1]?.trim() ||
  'غير محدد';
  

    const lunaTripStops =
  Array.isArray(
    state.tripStops
  )
    ? state.tripStops
        .map(
          (
            stop,
            index
          ) => {
            const city =
              String(
                stop?.city ||
                ''
              ).trim();


            if (
              !city
            ) {
              return '';
            }


            const parentCity =
              String(
                stop?.parentCity ||
                ''
              ).trim();


            const displayCity =
              parentCity &&
              parentCity !== city
                ? `${city} - ${parentCity}`
                : city;


            const stopType =
              stop?.stopType ===
                'pass_through'
                ? 'pass_through'
                : 'stay';


            const isPassThrough =
              stopType ===
                'pass_through';


            const parsedNights =
              Number.parseInt(
                stop?.nights,
                10
              );


            const nights =
              isPassThrough
                ? 0
                : (
                    Number.isFinite(
                      parsedNights
                    )
                      ? Math.max(
                          0,
                          parsedNights
                        )
                      : 1
                  );


            const transportLabels = {
              best:
                'اختر أفضل وسيلة حسب المسافة',

              domestic_flight:
                'طيران داخلي',

              private_car:
                'سيارة خاصة',

              train:
                'قطار',

              ferry:
                'عبّارة',

              boat:
                'قارب',

              shared_transfer:
                'نقل مشترك',

              no_preference:
                'بدون تفضيل'
            };


            const transport =
              index <
                state.tripStops.length - 1
                ? (
                    transportLabels[
                      stop?.transportToNext
                    ] ||
                    'اختر أفضل وسيلة'
                  )
                : 'نهاية الرحلة';


            const stayDescription =
              isPassThrough
                ? 'عبور فقط - بدون إقامة وبدون فندق'
                : `${nights} ${nights === 1 ? 'ليلة' : 'ليال'}`;


            return [
              `${index + 1}. ${displayCity}`,
              `tripStopIndex=${index}`,
              `نوع المحطة: ${isPassThrough ? 'عبور فقط' : 'إقامة'}`,
              `الإقامة: ${stayDescription}`,
              `الانتقال التالي: ${transport}`
            ].join(' | ');
          }
        )
        .filter(
          Boolean
        )
        .join('\n')
    : '';

  return `
ابحث على الويب عن خيارات طيران وفنادق حقيقية ومتاحة للرحلة التالية.

بيانات الرحلة
مدينة المغادرة: ${origin}
الوجهة: ${destination}
تاريخ السفر: ${startDate}
تاريخ العودة: ${endDate}
المسافرون: ${adults} بالغ${children ? `، ${children} طفل` : ''}
${children ? `أعمار الأطفال: ${childAges.length ? childAges.join('، ') : 'غير محددة'}` : ''}
درجة الطيران: ${flightClass}
تصنيف الفندق: ${hotelStars} نجوم
الميزانية: ${budget}
نوع الرحلة: ${tripStyle}
${customerNotes ? `طلبات خاصة: ${customerNotes}` : ''}

مسار الرحلة
${lunaTripStops || `1. ${destination}`}

المطلوب
لكل خدمة أعد خيارين فقط:
- economy: أرخص خيار جيد وعملي.
- premium: أفضل قيمة مقابل السعر، مريح ومزاياه جيدة بدون مبالغة في السعر.

الطيران الدولي
- خياران فقط: economy و premium.
- كل خيار يمثل رحلة الذهاب والعودة كاملة داخل عنصر flight واحد.
- flightType="international"
- groupKey="international-roundtrip"
- groupLabel="الطيران الدولي"
- optionType="economy" أو "premium"
- كل جزء طيران يكون داخل segments.
- direction="outbound" للذهاب.
- direction="return" للعودة.
- الترانزيت لا يكون flight مستقلاً.
- outboundDuration هي مدة الذهاب كاملة من أول إقلاع حتى الوصول النهائي وتشمل الترانزيت.
- returnDuration هي مدة العودة كاملة من أول إقلاع حتى الوصول النهائي وتشمل الترانزيت.
- layoverAfter هي مدة التوقف بعد المقطع، وتكون فارغة إذا لم يوجد توقف.
- layoverCity هي مدينة التوقف بعد هذا المقطع، مثال "أبوظبي"، وتكون فارغة إذا لم يوجد توقف.
- layoverType يحدد نوع التوقف بعد هذا المقطع.
- استخدم layoverType="transit" إذا كان التوقف ترانزيت أو اتصال رحلة عادي.
- استخدم layoverType="transfer" فقط إذا كان المصدر يوضح أن التوقف Transfer أو Self-transfer أو يتطلب انتقالاً منفصلاً أو تغيير مطار.
- إذا لم يوجد توقف اجعل layoverAfter="" وlayoverCity="" وlayoverType="".
- لا تخمن أن التوقف transfer. إذا لم يوجد دليل واضح على transfer اعتبره transit.
- استخدم اسم مدينة التوقف الفعلي وليس رمز المطار فقط.
- مثال: إذا كان التوقف في أبوظبي وكان اتصالاً عادياً، استخدم layoverCity="أبوظبي" وlayoverType="transit".
- مثال: إذا كان التوقف في أبوظبي ويتطلب Transfer مؤكداً، استخدم layoverCity="أبوظبي" وlayoverType="transfer".
- استخدم أوقات الإقلاع والوصول المحلية كما تظهر في المصدر.
- فضل الرحلة المباشرة، ثم الأقل توقفاً، مع مراعاة السعر والراحة.
- في baggage لا تكتب الوزن أو عدد القطع أو تفاصيل السياسة.
- استخدم فقط وصفاً مختصراً من هذه القيم:
  "أمتعة مشحونة + حقيبة يد"
  "أمتعة مشحونة"
  "حقيبة يد"
  "غير محددة"
الطيران الداخلي
- ابحث فقط عن الانتقالات المحددة كطيران داخلي في مسار الرحلة.
- لكل انتقال خياران فقط: economy و premium.
- flightType="domestic"
- لكل مسار groupKey مستقل مثل "domestic-0-1".
- groupLabel يكون اسم المسار.
- لا تدمج انتقالين داخليين مختلفين.
- الترانزيت يبقى داخل segments لنفس الرحلة.

الفنادق
- لكل محطة نوعها "إقامة" ابحث عن خيارين فقط: economy و premium.
- لا تبحث عن أي فندق لمحطة نوعها "عبور فقط".
- لا تنشئ hotel object لأي محطة مكتوب فيها "عبور فقط - بدون إقامة وبدون فندق".
- استخدم tripStopIndex المكتوب صراحة بجانب المحطة في مسار الرحلة.
- tripStopIndex هو رقم المحطة في المسار الكامل وليس ترتيب الفنادق فقط.
- لا تعيد ترقيم tripStopIndex بعد تجاهل محطات العبور.
- مثال: إذا كانت المحطات tripStopIndex=0 إقامة و tripStopIndex=1 عبور فقط و tripStopIndex=2 إقامة، فيجب أن تستخدم الفنادق الرقمين 0 و2 فقط.
- استخدم stayKey="stay-{tripStopIndex}" بنفس tripStopIndex الأصلي.
- لا تستخدم stayKey لمحطة عبور فقط.
- لا تدمج إقامتين حتى لو تكررت نفس المدينة.
- التزم بعدد الليالي المكتوب لكل محطة إقامة.
- لا تحول 0 ليلة إلى ليلة واحدة.
- roomType يكون اسم نوع الغرفة مختصراً فقط.
- roomSize = مساحة الغرفة فقط، مثال "28 m²". إذا لم تكن مؤكدة استخدم "".
- taxesIncluded=true إذا كان totalPrice يشمل الضرائب والرسوم الإلزامية.
- taxesIncluded=false إذا كانت هناك ضريبة أو رسوم إلزامية تضاف فوق totalPrice.
- إذا taxesIncluded=false ضع قيمة الضريبة الإجمالية في taxesAmount.
- إذا taxesIncluded=true اجعل taxesAmount=null.
- لا تضف الضريبة إلى totalPrice عندما taxesIncluded=false.
- أظهر الوجبات وسياسة الإلغاء إذا كانت متوفرة.
- premium يعني موقع أو تقييم أو غرفة أو مزايا أفضل بسعر منطقي.

قواعد البحث
- استخدم معلومات حقيقية وحديثة من الويب.
- لا تخمن الأسعار أو المواعيد أو التوفر.
- ضع المصدر والرابط لكل خيار.
- totalPrice هو السعر الإجمالي.
- استخدم SAR عندما يكون السعر بالريال السعودي.
- إذا لم تتأكد من قيمة استخدم null أو "".
- أعد JSON صالح فقط.
- لا تكتب markdown أو أي شرح قبل JSON أو بعده.

JSON المطلوب

{
  "flights": [
    {
      "flightType": "international",
      "groupKey": "international-roundtrip",
      "groupLabel": "الطيران الدولي",
      "optionType": "economy",

      "airline": "",
      "cabinClass": "",

      "totalPrice": null,
      "currency": "SAR",

      "baggage": "",

      "outboundDuration": "",
      "returnDuration": "",

      "sourceName": "",
      "sourceUrl": "",
      "verifiedAt": "",

      "segments": [
        {
          "direction": "outbound",

          "from": "",
          "to": "",

          "departureDate": "YYYY-MM-DD",
          "departureTime": "HH:mm",

          "arrivalDate": "YYYY-MM-DD",
          "arrivalTime": "HH:mm",

                    "duration": "",
          "layoverAfter": "",
          "layoverCity": "",
          "layoverType": ""
        }
      ]
    }
  ],

  "hotels": [
    {
      "tripStopIndex": 0,
      "stayKey": "stay-0",
      "optionType": "economy",

      "name": "",
      "city": "",
      "stars": null,

      "roomType": "",
"roomSize": "",
"board": "",

      "checkIn": "YYYY-MM-DD",
      "checkOut": "YYYY-MM-DD",
      "nights": null,

      "totalPrice": null,
"currency": "SAR",

"taxesIncluded": true,
"taxesAmount": null,

"cancellation": "",

      "sourceName": "",
      "sourceUrl": "",
      "verifiedAt": ""
    }
  ]
}
`.trim();
}


async function copyLunaTravelSearchPrompt() {
  const prompt =
    buildLunaTravelSearchPrompt();


  try {
    await navigator.clipboard.writeText(
      prompt
    );


    toast(
      'تم نسخ طلب البحث. الصقه الآن في Luna'
    );


    return;
  } catch (
    error
  ) {
    console.warn(
      '[Luna Clipboard]',
      error
    );
  }


  const textarea =
    document.createElement(
      'textarea'
    );


  textarea.value =
    prompt;


  textarea.style.position =
    'fixed';


  textarea.style.opacity =
    '0';


  document.body.appendChild(
    textarea
  );


  textarea.select();


  document.execCommand(
    'copy'
  );


  textarea.remove();


  toast(
    'تم نسخ طلب البحث. الصقه الآن في Luna'
  );
}


$('#lunaTravelSearchBtn')
  ?.addEventListener(
    'click',
    copyLunaTravelSearchPrompt
  );
  function setLunaResultsStatus(
  message,
  type = ''
) {
  const status =
    $('#lunaResultsStatus');


  if (
    !status
  ) {
    return;
  }


  status.hidden =
    !message;


  status.textContent =
    message;


  status.classList.toggle(
    'is-error',
    type === 'error'
  );


  status.classList.toggle(
    'is-success',
    type === 'success'
  );
}


function cleanLunaJsonText(
  value
) {
  let text =
    String(
      value ||
      ''
    ).trim();


  if (
    text.startsWith(
      '```'
    )
  ) {
    text =
      text.replace(
        /^```(?:json)?\s*/i,
        ''
      );


    text =
      text.replace(
        /\s*```$/,
        ''
      );
  }


  return text.trim();
}


function parseLunaResults() {
  const textarea =
    $('#lunaResultsJson');


  if (
    !textarea
  ) {
    throw new Error(
      'حقل نتائج Luna غير موجود'
    );
  }


  const text =
    cleanLunaJsonText(
      textarea.value
    );


  if (
    !text
  ) {
    throw new Error(
      'الصق نتائج Luna أولاً'
    );
  }


  let data;


  try {
    data =
      JSON.parse(
        text
      );
  } catch (
    error
  ) {
    console.error(
      '[Luna JSON]',
      error
    );


    throw new Error(
      'JSON غير صالح. تأكد أنك نسخت النتيجة كاملة من Luna'
    );
  }


  if (
    !data ||
    typeof data !==
      'object' ||
    Array.isArray(
      data
    )
  ) {
    throw new Error(
      'صيغة نتائج Luna غير صحيحة'
    );
  }


  const flights =
    Array.isArray(
      data.flights
    )
      ? data.flights
      : [];


  const hotels =
    Array.isArray(
      data.hotels
    )
      ? data.hotels
      : [];


  if (
    flights.length ===
      0 &&
    hotels.length ===
      0
  ) {
    throw new Error(
      'لم أجد أي رحلات أو فنادق داخل النتائج'
    );
  }


  return {
    flights,
    hotels
  };
}

function safeLunaSourceUrl(
  value
) {
  const url =
    String(
      value ||
      ''
    ).trim();


  if (
    !/^https?:\/\//i.test(
      url
    )
  ) {
    return '';
  }


  return url;
}


function lunaPriceText(
  value,
  currency = 'SAR'
) {
  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return 'السعر غير متوفر';
  }


  return `${englishNumber.format(number)} ${escapeHtml(
    currency ||
    'SAR'
  )}`;
}


function lunaFlightSegmentsHtml(
  segments,
  flight
) {
  if (
    !Array.isArray(
      segments
    ) ||
    !segments.length
  ) {
    return `
      <div class="luna-result-muted">
        تفاصيل الرحلة غير متوفرة
      </div>
    `;
  }


  function normalizeDirection(
    value
  ) {
    const direction =
      String(
        value ||
        ''
      )
        .trim()
        .toLowerCase();


    if (
      direction ===
        'outbound'
    ) {
      return 'outbound';
    }


    if (
      direction ===
        'return' ||
      direction ===
        'inbound'
    ) {
      return 'return';
    }


    return '';
  }


  const normalized =
    segments.map(
      segment => ({
        ...segment,

        _direction:
          normalizeDirection(
            segment?.direction
          )
      })
    );


  let outbound =
    normalized.filter(
      segment =>
        segment._direction ===
        'outbound'
    );


  let returning =
    normalized.filter(
      segment =>
        segment._direction ===
        'return'
    );


  /*
   * دعم النتائج القديمة التي لا تحتوي
   * على direction.
   */
  if (
    !outbound.length &&
    !returning.length
  ) {
    if (
      normalized.length ===
        2
    ) {
      outbound = [
        normalized[0]
      ];


      returning = [
        normalized[1]
      ];
    } else {
      const groups =
        [];


      let current =
        [];


      normalized.forEach(
        segment => {
          if (
            !current.length
          ) {
            current.push(
              segment
            );

            return;
          }


          const previous =
            current[
              current.length -
              1
            ];


          const previousTo =
            String(
              previous?.to ||
              ''
            )
              .trim()
              .toUpperCase();


          const currentFrom =
            String(
              segment?.from ||
              ''
            )
              .trim()
              .toUpperCase();


          if (
            previousTo &&
            currentFrom &&
            previousTo ===
              currentFrom
          ) {
            current.push(
              segment
            );

            return;
          }


          groups.push(
            current
          );


          current = [
            segment
          ];
        }
      );


      if (
        current.length
      ) {
        groups.push(
          current
        );
      }


      outbound =
        groups[0] ||
        [];


      returning =
        groups[1] ||
        [];
    }
  }


  


  function directionHtml(
  label,
  group,
  totalDuration
) {
    if (
      !group.length
    ) {
      return '';
    }


    const first =
      group[0];


    const last =
      group[
        group.length - 1
      ];


    const from =
      String(
        first?.from ||
        'غير محدد'
      ).trim();


    const to =
      String(
        last?.to ||
        'غير محدد'
      ).trim();


    const departureDate =
      String(
        first?.departureDate ||
        'غير محدد'
      ).trim();


    const departureTime =
      String(
        first?.departureTime ||
        'غير محدد'
      ).trim();


      const arrivalTime =
  String(
    last?.arrivalTime ||
    'غير محدد'
  ).trim();


        const stops =
      Math.max(
        0,
        group.length - 1
      );


    const layovers =
      group
        .slice(
          0,
          -1
        )
        .map(
          segment => {
            const duration =
              String(
                segment?.layoverAfter ||
                ''
              ).trim();


            const city =
              String(
                segment?.layoverCity ||
                ''
              ).trim();


            const type =
              String(
                segment?.layoverType ||
                ''
              )
                .trim()
                .toLowerCase();


            const typeLabel =
              type ===
                'transfer'
                ? 'ترانسفير'
                : 'ترانزيت';


            return {
              duration,
              city,
              typeLabel
            };
          }
        );


    const layoverText =
      layovers
        .map(
          layover =>
            layover.duration
        )
        .filter(
          Boolean
        )
        .join(
          ' + '
        ) ||
      (
        stops === 0
          ? 'لا يوجد'
          : 'غير محددة'
      );


    const layoverPlacesHtml =
      layovers
        .map(
          layover => {
            if (
              !layover.city
            ) {
              return '';
            }


            return `
              <small>
                <b>
                  التوقف:
                </b>

                ${escapeHtml(
                  `${layover.typeLabel} ${layover.city}`
                )}
              </small>
            `;
          }
        )
        .filter(
          Boolean
        )
        .join(
          ''
        );


    const duration =
      String(
        totalDuration ||
        ''
      ).trim() ||
      'غير محددة';


    return `
      <div class="luna-segment">

        <strong>
          ${escapeHtml(
            label
          )}
        </strong>


        <span>
          <b>
            المسار:
          

          ${escapeHtml(
            from
          )}

          →

          ${escapeHtml(
            to
          )}
          </b>
        </span>


        <small>
          <b>
            تاريخ الإقلاع:
          </b>

          ${escapeHtml(
            departureDate
          )}
        </small>


        <small>
          <b>
            وقت الإقلاع:
          </b>

          ${escapeHtml(
            departureTime
          )}
        </small>


        <small>
          <b>
            وقت الوصول:
          </b>

          ${escapeHtml(
            arrivalTime
          )}
        </small>


        <small>
          <b>
            التوقفات:
          </b>

          ${
            stops === 0
              ? 'مباشر'
              : escapeHtml(
                  String(
                    stops
                  )
                )
          }
        </small>


        ${
          stops > 0
            ? `
              ${layoverPlacesHtml}

              <small>
                <b>
                  مدة التوقف:
                </b>

                ${escapeHtml(
                  layoverText
                )}
              </small>
            `
            : ''
        }


        <small>
          <b>
            مدة الرحلة:
          </b>

          ${escapeHtml(
            duration
          )}
        </small>

      </div>
    `;
  }


  return `
    ${directionHtml(
  'ذهاب',
  outbound,
  flight?.outboundDuration
)}

${directionHtml(
  'عودة',
  returning,
  flight?.returnDuration
)}
  `;
}


function lunaOptionType(
  value
) {
  return String(
    value ||
    ''
  )
    .trim()
    .toLowerCase() ===
      'premium'
      ? 'premium'
      : 'economy';
}


function lunaOptionLabel(
  value
) {
  return lunaOptionType(
    value
  ) === 'premium'
    ? 'ممتاز'
    : 'اقتصادي';
}


function lunaSelectButton(
  type,
  index,
  groupKey,
  optionType
) {
  const selected =
    selectedLunaResults[
      type
    ]?.has(
      index
    );


  return `
    <button
      type="button"
      class="luna-select-btn${selected ? ' is-selected' : ''}"
      data-luna-select-type="${escapeHtml(type)}"
      data-luna-select-index="${index}"
      data-luna-group="${escapeHtml(groupKey)}"
      data-luna-option-type="${escapeHtml(
        lunaOptionType(
          optionType
        )
      )}"
    >
      ${
        selected
          ? '✓ تم الاختيار'
          : 'اختيار'
      }
    </button>
  `;
}


function shortLunaBaggage(
  value
) {
  const text =
    String(
      value ||
      ''
    )
      .trim()
      .replace(
        /\s+/g,
        ' '
      );


  if (
    !text
  ) {
    return 'غير محددة';
  }


  /*
   * نلتقط أوزان الأمتعة مثل:
   * 25 kg
   * 7kg
   * 23 KG
   */
  const matches =
    [
      ...text.matchAll(
        /(\d+(?:\.\d+)?)\s*kg\b/gi
      )
    ];


  const weights =
    [];


  matches.forEach(
    match => {
      const weight =
        `${match[1]}kg`;


      if (
        !weights.includes(
          weight
        )
      ) {
        weights.push(
          weight
        );
      }
    }
  );


  if (
    weights.length
  ) {
    return weights
      .slice(
        0,
        2
      )
      .join(
        ' + '
      );
  }


  /*
   * إذا لم نجد kg نختصر النص فقط.
   */
  return text.length >
    40
      ? `${text.slice(0, 37).trim()}...`
      : text;
}


function shortLunaCancellation(
  value
) {
  const text =
    String(
      value ||
      ''
    )
      .trim()
      .replace(
        /\s+/g,
        ' '
      );


  if (
    !text
  ) {
    return '';
  }


  const lower =
    text.toLowerCase();


  /*
   * غير قابل للاسترداد
   */
  if (
    lower.includes(
      'non-refundable'
    ) ||
    lower.includes(
      'non refundable'
    ) ||
    text.includes(
      'غير قابل للاسترداد'
    )
  ) {
    return 'غير قابل للاسترداد';
  }


  /*
   * نبحث عن التاريخ.
   */
  const dateMatch =
    text.match(
      /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/
    );


  const hasFreeCancellation =
    lower.includes(
      'free cancellation'
    ) ||
    text.includes(
      'إلغاء مجاني'
    ) ||
    text.includes(
      'الإلغاء مجاني'
    ) ||
    text.includes(
      'مجاني حتى'
    );


  if (
    hasFreeCancellation
  ) {
    if (
      dateMatch
    ) {
      return `مجاني حتى ${dateMatch[0]}`;
    }


    return 'إلغاء مجاني';
  }


  /*
   * إلغاء برسوم
   */
  if (
    lower.includes(
      'cancellation fee'
    ) ||
    text.includes(
      'رسوم إلغاء'
    ) ||
    text.includes(
      'إلغاء برسوم'
    )
  ) {
    return 'إلغاء برسوم';
  }


  /*
   * أي صيغة أخرى نختصرها.
   */
  return text.length >
    45
      ? `${text.slice(0, 42).trim()}...`
      : text;
}

function lunaFlightCardHtml(
  flight,
  index,
  groupKey
) {
  const sourceUrl =
    safeLunaSourceUrl(
      flight?.sourceUrl
    );


  const optionType =
    lunaOptionType(
      flight?.optionType
    );


  const optionLabel =
    lunaOptionLabel(
      optionType
    );


  return `
    <article
      class="luna-result-card"
      data-option-type="${escapeHtml(
        optionType
      )}"
    >

      <div class="luna-option-badge">
        ${escapeHtml(
          optionLabel
        )}
      </div>


      <div class="luna-result-card-head">

        <div>

          <span class="luna-result-number">
            ${
              optionType ===
                'premium'
                ? 'أفضل قيمة مقابل السعر'
                : 'الخيار الاقتصادي'
            }
          </span>


          <h4>
            ${escapeHtml(
              flight?.airline ||
              'شركة الطيران غير محددة'
            )}
          </h4>

        </div>


        <strong class="luna-result-price">
          ${lunaPriceText(
            flight?.totalPrice,
            flight?.currency
          )}
        </strong>

      </div>


      <div class="luna-result-meta luna-flight-meta">

  <span>
    <b>الدرجة:</b>

    ${escapeHtml(
      flight?.cabinClass ||
      'غير محددة'
    )}
  </span>


  <span>
    <b>الأمتعة:</b>

    ${escapeHtml(
      flight?.baggage ||
      'غير محددة'
    )}
  </span>

</div>


      <div class="luna-segments-list">
        ${lunaFlightSegmentsHtml(
          flight?.segments,
          flight
        )}
      </div>


      <div class="luna-result-source">

        <span>
          المصدر:

          ${escapeHtml(
            flight?.sourceName ||
            'غير محدد'
          )}
        </span>


        ${
          sourceUrl
            ? `
              <a
                href="${escapeHtml(
                  sourceUrl
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                فتح المصدر
              </a>
            `
            : ''
        }

      </div>


      ${lunaSelectButton(
        'flights',
        index,
        groupKey,
        optionType
      )}

    </article>
  `;
}


function shortLunaRoomType(
  value
) {
  const roomType =
    String(
      value ||
      ''
    )
      .trim()
      .replace(
        /\s+/g,
        ' '
      );


  if (
    !roomType
  ) {
    return 'غير محددة';
  }


  /*
   * نحذف ما بعد كلمات المزايا الشائعة.
   *
   * مثال:
   * Outdoor Jacuzzi Suite with ...
   * تصبح:
   * Outdoor Jacuzzi Suite
   */
  const clean =
    roomType
      .split(
        /\s+(?:with|including|includes|featuring|plus|مع|يشمل|تشمل)\s+/i
      )[0]
      .split(
        /\s*[|;,]\s*/
      )[0]
      .trim();


  const words =
    clean.split(
      /\s+/
    );


  /*
   * حد أقصى 6 كلمات حتى يبقى الاسم مختصراً.
   */
  return words
    .slice(
      0,
      6
    )
    .join(
      ' '
    );
}

function lunaHotelCardHtml(
  hotel,
  index,
  groupKey
) {
  const sourceUrl =
    safeLunaSourceUrl(
      hotel?.sourceUrl
    );


  const optionType =
    lunaOptionType(
      hotel?.optionType
    );


  const optionLabel =
    lunaOptionLabel(
      optionType
    );


    const taxesNotIncluded =
  hotel?.taxesIncluded === false ||
  String(
    hotel?.taxesIncluded
  )
    .trim()
    .toLowerCase() ===
    'false';


const taxesAmount =
  Number(
    hotel?.taxesAmount
  );


const hotelTaxText =
  taxesNotIncluded &&
  Number.isFinite(
    taxesAmount
  ) &&
  taxesAmount > 0
    ? `الضريبة ${lunaPriceText(
        taxesAmount,
        hotel?.currency
      )}`
    : '';

  return `
    <article
      class="luna-result-card"
      data-option-type="${escapeHtml(
        optionType
      )}"
    >

      <div class="luna-option-badge">
        ${escapeHtml(
          optionLabel
        )}
      </div>


      <div class="luna-result-card-head">

        <div>

          <span class="luna-result-number">
            ${
              optionType ===
                'premium'
                ? 'أفضل قيمة مقابل السعر'
                : 'الخيار الاقتصادي'
            }
          </span>

          <h4>
            ${escapeHtml(
              hotel?.name ||
              'اسم الفندق غير محدد'
            )}
          </h4>

        </div>


        <div class="luna-hotel-price-wrap">

  <strong class="luna-result-price">
    ${lunaPriceText(
      hotel?.totalPrice,
      hotel?.currency
    )}
  </strong>


  ${
    hotelTaxText
      ? `
        <small class="luna-hotel-tax">
          ${escapeHtml(
            hotelTaxText
          )}
        </small>
      `
      : ''
  }

</div>

      </div>


      <div class="luna-result-meta">

        <span>
          <b>المدينة:</b>

          ${escapeHtml(
            hotel?.city ||
            'غير محددة'
          )}
        </span>


        <span>
          <b>التصنيف:</b>

          ${
            hotel?.stars
              ? `${escapeHtml(
                  String(
                    hotel.stars
                  )
                )} نجوم`
              : 'غير محدد'
          }
        </span>


        <span>
  <b>الغرفة:</b>

  ${escapeHtml(
    shortLunaRoomType(
      hotel?.roomType
    )
  )}
</span>


${
  hotel?.roomSize
    ? `
      <span>
        <b>المساحة:</b>

        ${escapeHtml(
          hotel.roomSize
        )}
      </span>
    `
    : ''
}


<span>
  <b>الوجبات:</b>

          ${escapeHtml(
            hotel?.board ||
            'غير محددة'
          )}
        </span>


        <span>
          <b>الدخول:</b>

          ${escapeHtml(
            hotel?.checkIn ||
            'غير محدد'
          )}
        </span>


        <span>
          <b>الخروج:</b>

          ${escapeHtml(
            hotel?.checkOut ||
            'غير محدد'
          )}
        </span>


        <span>
          <b>الليالي:</b>

          ${escapeHtml(
            String(
              hotel?.nights ??
              'غير محدد'
            )
          )}
        </span>

      </div>


      ${
        hotel?.cancellation
          ? `
            <div class="luna-result-note">

              <b>
                سياسة الإلغاء:
              </b>

              ${escapeHtml(
  shortLunaCancellation(
    hotel.cancellation
  )
)}

            </div>
          `
          : ''
      }


      <div class="luna-result-source">

        <span>
          المصدر:

          ${escapeHtml(
            hotel?.sourceName ||
            'غير محدد'
          )}
        </span>


        ${
          sourceUrl
            ? `
              <a
                href="${escapeHtml(
                  sourceUrl
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                فتح المصدر
              </a>
            `
            : ''
        }

      </div>


      ${lunaSelectButton(
        'hotels',
        index,
        groupKey,
        optionType
      )}

    </article>
  `;
}


function lunaDomesticGroupLabel(
  flight
) {
  const explicitLabel =
    String(
      flight?.groupLabel ||
      ''
    ).trim();


  if (
    explicitLabel
  ) {
    return explicitLabel;
  }


  const segments =
    Array.isArray(
      flight?.segments
    )
      ? flight.segments
      : [];


  const firstSegment =
    segments[0];


  const lastSegment =
    segments[
      segments.length - 1
    ];


  const from =
    String(
      firstSegment?.from ||
      ''
    ).trim();


  const to =
    String(
      lastSegment?.to ||
      ''
    ).trim();


  if (
    from &&
    to
  ) {
    return `${from} إلى ${to}`;
  }


  return 'رحلة داخلية';
}


function activateLunaResultsTab(
  tabName
) {
  const tabs =
    [
      ...document.querySelectorAll(
        '#lunaResultsTabs .luna-results-tab'
      )
    ];


  const panels =
    [
      ...document.querySelectorAll(
        '#lunaResultsPreview [data-luna-panel]'
      )
    ];


  tabs.forEach(
    tab => {
      tab.classList.toggle(
        'is-active',
        tab.dataset
          .lunaTab ===
          tabName
      );
    }
  );


  panels.forEach(
    panel => {
      panel.hidden =
        panel.dataset
          .lunaPanel !==
        tabName;
    }
  );
}


function renderLunaResultsPreview(
  results
) {
  const preview =
    $('#lunaResultsPreview');


  const tabs =
    $('#lunaResultsTabs');


  if (
    !preview
  ) {
    return;
  }


  const flights =
    Array.isArray(
      results?.flights
    )
      ? results.flights
      : [];


  const hotels =
    Array.isArray(
      results?.hotels
    )
      ? results.hotels
      : [];


  /*
   * نحافظ على رقم العنصر الأصلي لأن
   * selectedLunaResults يعتمد عليه.
   */
  const flightItems =
    flights.map(
      (
        flight,
        index
      ) => ({
        flight,
        index
      })
    );


  const hotelItems =
  hotels
    .map(
      (
        hotel,
        index
      ) => ({
        hotel,
        index
      })
    )
    .filter(
      item => {
        const tripStopIndex =
          Number(
            item.hotel
              ?.tripStopIndex
          );


        /*
         * إذا لم يرسل Luna رقم محطة صالحًا،
         * نترك الفندق يظهر كالمعتاد.
         * الحماية هنا مخصصة فقط لمحطات
         * العبور المعروفة في المسار.
         */
        if (
          !Number.isInteger(
            tripStopIndex
          ) ||
          tripStopIndex < 0
        ) {
          return true;
        }


        const tripStop =
          state.tripStops?.[
            tripStopIndex
          ] ||
          null;


        /*
         * إذا الرقم لا يشير إلى محطة موجودة،
         * لا نخفي الفندق هنا.
         */
        if (
          !tripStop
        ) {
          return true;
        }


        const stopType =
          tripStop?.stopType ===
            'pass_through'
            ? 'pass_through'
            : 'stay';


        const parsedNights =
          Number.parseInt(
            tripStop?.nights,
            10
          );


        const hasNoStay =
          stopType ===
            'pass_through' ||
          (
            Number.isFinite(
              parsedNights
            ) &&
            parsedNights <= 0
          );


        /*
         * محطة عبور أو محطة بدون ليال:
         * لا نظهر الفندق في نتائج Luna.
         */
        return !hasNoStay;
      }
    );


  const internationalFlights =
    flightItems.filter(
      item => {
        const flightType =
          String(
            item.flight
              ?.flightType ||
            ''
          )
            .trim()
            .toLowerCase();


        const groupKey =
          String(
            item.flight
              ?.groupKey ||
            ''
          )
            .trim()
            .toLowerCase();


        /*
         * إذا كان JSON قديم ولا يحتوي
         * flightType نعتبره دولياً إلا
         * إذا كان محدداً كداخلي.
         */
        return (
          flightType ===
            'international' ||
          (
            flightType !==
              'domestic' &&
            !groupKey.startsWith(
              'domestic-'
            )
          )
        );
      }
    );


  const domesticFlights =
    flightItems.filter(
      item => {
        const flightType =
          String(
            item.flight
              ?.flightType ||
            ''
          )
            .trim()
            .toLowerCase();


        const groupKey =
          String(
            item.flight
              ?.groupKey ||
            ''
          )
            .trim()
            .toLowerCase();


        return (
          flightType ===
            'domestic' ||
          groupKey.startsWith(
            'domestic-'
          )
        );
      }
    );


  /*
   * =======================================================
   * الطيران الدولي
   * =======================================================
   */

  const internationalGroupKey =
    'international-roundtrip';


  const internationalSorted =
    [...internationalFlights]
      .sort(
        (
          a,
          b
        ) => {
          const order = {
            economy:
              0,

            premium:
              1
          };


          return (
            order[
              lunaOptionType(
                a.flight
                  ?.optionType
              )
            ] -
            order[
              lunaOptionType(
                b.flight
                  ?.optionType
              )
            ]
          );
        }
      );


  const internationalHtml =
    internationalSorted.length
      ? `
        <section class="luna-results-group">

          <div class="luna-results-group-head">

            <strong>
              الطيران الدولي
            </strong>

            <span>
              الذهاب والعودة
            </span>

          </div>


          <div class="luna-options-grid">

            ${internationalSorted
              .map(
                item =>
                  lunaFlightCardHtml(
                    item.flight,
                    item.index,
                    internationalGroupKey
                  )
              )
              .join(
                ''
              )}

          </div>

        </section>
      `
      : `
        <div class="luna-result-empty">
          لا توجد خيارات طيران دولي
        </div>
      `;


  /*
   * =======================================================
   * الطيران الداخلي
   * =======================================================
   */

  const domesticGroups =
    new Map();


  domesticFlights.forEach(
    (
      item,
      position
    ) => {
      const flight =
        item.flight;


      const groupKey =
        String(
          flight?.groupKey ||
          ''
        ).trim() ||
        `domestic-${position}`;


      if (
        !domesticGroups.has(
          groupKey
        )
      ) {
        domesticGroups.set(
          groupKey,
          {
            key:
              groupKey,

            label:
              lunaDomesticGroupLabel(
                flight
              ),

            items:
              []
          }
        );
      }


      domesticGroups
        .get(
          groupKey
        )
        .items
        .push(
          item
        );
    }
  );


  const domesticHtml =
    domesticGroups.size
      ? [
          ...domesticGroups.values()
        ]
          .map(
            group => {
              const sorted =
                [...group.items]
                  .sort(
                    (
                      a,
                      b
                    ) => {
                      const order = {
                        economy:
                          0,

                        premium:
                          1
                      };


                      return (
                        order[
                          lunaOptionType(
                            a.flight
                              ?.optionType
                          )
                        ] -
                        order[
                          lunaOptionType(
                            b.flight
                              ?.optionType
                          )
                        ]
                      );
                    }
                  );


              return `
                <section class="luna-results-group">

                  <div class="luna-results-group-head">

                    <strong>
                      ${escapeHtml(
                        group.label
                      )}
                    </strong>

                    <span>
                      اختر رحلة واحدة
                    </span>

                  </div>


                  <div class="luna-options-grid">

                    ${sorted
                      .map(
                        item =>
                          lunaFlightCardHtml(
                            item.flight,
                            item.index,
                            group.key
                          )
                      )
                      .join(
                        ''
                      )}

                  </div>

                </section>
              `;
            }
          )
          .join(
            ''
          )
      : `
        <div class="luna-result-empty">
          لا توجد رحلات داخلية لهذا المسار
        </div>
      `;


  /*
   * =======================================================
   * الفنادق
   * =======================================================
   */

  const hotelGroups =
    new Map();


  hotelItems.forEach(
    (
      item,
      position
    ) => {
      const hotel =
        item.hotel;


      const rawTripStopIndex =
        Number(
          hotel?.tripStopIndex
        );


      const hasTripStopIndex =
        Number.isInteger(
          rawTripStopIndex
        ) &&
        rawTripStopIndex >=
          0;


      const tripStopIndex =
        hasTripStopIndex
          ? rawTripStopIndex
          : null;


      const stayKey =
        String(
          hotel?.stayKey ||
          ''
        ).trim() ||
        (
          tripStopIndex !==
            null
            ? `stay-${tripStopIndex}`
            : `stay-fallback-${position}`
        );


      const routeCity =
        tripStopIndex !==
          null
          ? String(
              state.tripStops?.[
                tripStopIndex
              ]?.city ||
              ''
            ).trim()
          : '';


      const city =
        routeCity ||
        String(
          hotel?.city ||
          'مدينة غير محددة'
        ).trim();


      if (
        !hotelGroups.has(
          stayKey
        )
      ) {
        hotelGroups.set(
          stayKey,
          {
            key:
              stayKey,

            city,

            tripStopIndex,

            checkIn:
              hotel?.checkIn ||
              '',

            checkOut:
              hotel?.checkOut ||
              '',

            items:
              []
          }
        );
      }


      hotelGroups
        .get(
          stayKey
        )
        .items
        .push(
          item
        );
    }
  );


  const sortedHotelGroups =
    [
      ...hotelGroups.values()
    ]
      .sort(
        (
          a,
          b
        ) => {
          if (
            a.tripStopIndex !==
              null &&
            b.tripStopIndex !==
              null
          ) {
            return (
              a.tripStopIndex -
              b.tripStopIndex
            );
          }


          if (
            a.tripStopIndex !==
              null
          ) {
            return -1;
          }


          if (
            b.tripStopIndex !==
              null
          ) {
            return 1;
          }


          return 0;
        }
      );


  const hotelsHtml =
    sortedHotelGroups.length
      ? sortedHotelGroups
          .map(
            (
              group,
              groupIndex
            ) => {
              const sorted =
                [...group.items]
                  .sort(
                    (
                      a,
                      b
                    ) => {
                      const order = {
                        economy:
                          0,

                        premium:
                          1
                      };


                      return (
                        order[
                          lunaOptionType(
                            a.hotel
                              ?.optionType
                          )
                        ] -
                        order[
                          lunaOptionType(
                            b.hotel
                              ?.optionType
                          )
                        ]
                      );
                    }
                  );


              const stayNumber =
                group.tripStopIndex !==
                  null
                  ? group.tripStopIndex +
                    1
                  : groupIndex +
                    1;


              return `
                <section class="luna-results-group">

                  <div class="luna-results-group-head">

                    <strong>
                      ${escapeHtml(
                        group.city
                      )}
                      |
                      الإقامة ${stayNumber}
                    </strong>

                    <span>
                      ${
                        group.checkIn
                          ? escapeHtml(
                              group.checkIn
                            )
                          : ''
                      }

                      ${
                        group.checkIn &&
                        group.checkOut
                          ? ' إلى '
                          : ''
                      }

                      ${
                        group.checkOut
                          ? escapeHtml(
                              group.checkOut
                            )
                          : ''
                      }
                    </span>

                  </div>


                  <div class="luna-options-grid">

                    ${sorted
                      .map(
                        item =>
                          lunaHotelCardHtml(
                            item.hotel,
                            item.index,
                            group.key
                          )
                      )
                      .join(
                        ''
                      )}

                  </div>

                </section>
              `;
            }
          )
          .join(
            ''
          )
      : `
        <div class="luna-result-empty">
          لا توجد خيارات فنادق
        </div>
      `;


  preview.innerHTML = `

    <div
      class="luna-results-panel"
      data-luna-panel="international"
    >
      ${internationalHtml}
    </div>


    <div
      class="luna-results-panel"
      data-luna-panel="domestic"
      hidden
    >
      ${domesticHtml}
    </div>


    <div
      class="luna-results-panel"
      data-luna-panel="hotels"
      hidden
    >
      ${hotelsHtml}
    </div>

  `;


  preview.hidden =
    false;


  if (
    tabs
  ) {
    tabs.hidden =
      false;
  }


  activateLunaResultsTab(
    'international'
  );
}


$('#lunaResultsTabs')
  ?.addEventListener(
    'click',
    event => {
      const button =
        event.target.closest(
          '.luna-results-tab'
        );


      if (
        !button
      ) {
        return;
      }


      const tabName =
        String(
          button.dataset
            .lunaTab ||
          ''
        ).trim();


      if (
        ![
          'international',
          'domestic',
          'hotels'
        ].includes(
          tabName
        )
      ) {
        return;
      }


      activateLunaResultsTab(
        tabName
      );
    }
  );


$('#lunaResultsPreview')
  ?.addEventListener(
    'click',
    event => {
      const button =
        event.target.closest(
          '.luna-select-btn'
        );


      if (
        !button
      ) {
        return;
      }


      const type =
        button.dataset
          .lunaSelectType;


      const index =
        Number.parseInt(
          button.dataset
            .lunaSelectIndex,
          10
        );


      const groupKey =
        String(
          button.dataset
            .lunaGroup ||
          ''
        );


      if (
        ![
          'flights',
          'hotels'
        ].includes(
          type
        ) ||
        !Number.isInteger(
          index
        )
      ) {
        return;
      }


      const selectedSet =
        selectedLunaResults[
          type
        ];


      /*
       * إذا ضغط المستخدم على الخيار
       * المختار نفسه، نلغي اختياره.
       */
      if (
        selectedSet.has(
          index
        )
      ) {
        selectedSet.delete(
          index
        );


        button.classList.remove(
          'is-selected'
        );


        button.textContent =
          'اختيار';


        return;
      }


      /*
       * خيار واحد فقط لكل خدمة.
       *
       * اقتصادي أو ممتاز،
       * وليس الاثنين معاً.
       */
      const groupButtons =
        [
          ...document.querySelectorAll(
            '#lunaResultsPreview .luna-select-btn'
          )
        ]
          .filter(
            candidate =>
              candidate.dataset
                .lunaSelectType ===
                type &&
              String(
                candidate.dataset
                  .lunaGroup ||
                ''
              ) ===
                groupKey
          );


      groupButtons.forEach(
        candidate => {
          const candidateIndex =
            Number.parseInt(
              candidate.dataset
                .lunaSelectIndex,
              10
            );


          if (
            Number.isInteger(
              candidateIndex
            )
          ) {
            selectedSet.delete(
              candidateIndex
            );
          }


          candidate.classList.remove(
            'is-selected'
          );


          candidate.textContent =
            'اختيار';
        }
      );


      selectedSet.add(
        index
      );


      button.classList.add(
        'is-selected'
      );


      button.textContent =
        '✓ تم الاختيار';
    }
  );

  function getSelectedLunaResults() {
  const flights =
    Array.isArray(
      pendingLunaResults?.flights
    )
      ? pendingLunaResults.flights
      : [];


  const hotels =
    Array.isArray(
      pendingLunaResults?.hotels
    )
      ? pendingLunaResults.hotels
      : [];


  const selectedFlights =
    [...selectedLunaResults.flights]
      .sort(
        (a, b) =>
          a - b
      )
      .map(
        index =>
          flights[index]
      )
      .filter(
        Boolean
      );


  const selectedHotels =
    [...selectedLunaResults.hotels]
      .sort(
        (a, b) =>
          a - b
      )
      .map(
        index =>
          hotels[index]
      )
      .filter(
        Boolean
      );


  return {
    flights:
      selectedFlights,

    hotels:
      selectedHotels
  };
}


function importSelectedLunaResultsToOffer(
  selectedResults
) {
  const flights =
    Array.isArray(
      selectedResults?.flights
    )
      ? selectedResults.flights
      : [];


  const hotels =
    Array.isArray(
      selectedResults?.hotels
    )
      ? selectedResults.hotels
      : [];


  const travelerCount =
    Math.max(
      1,
      Number(
        $('#adults')?.value ||
        0
      ) +
      Number(
        $('#children')?.value ||
        0
      )
    );


  function normalizeRouteText(
    value
  ) {
    return String(
      value ||
      ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );
  }


  function serviceRoutes(
    service
  ) {
    const segments =
      Array.isArray(
        service?.segments
      )
        ? service.segments
        : [];


    return segments
      .map(
        segment => {
          const from =
            normalizeRouteText(
              segment?.from
            );


          const to =
            normalizeRouteText(
              segment?.to
            );


          if (
            !from ||
            !to
          ) {
            return '';
          }


          return `${from}>${to}`;
        }
      )
      .filter(
        Boolean
      );
  }


  function serviceDates(
    service
  ) {
    const segments =
      Array.isArray(
        service?.segments
      )
        ? service.segments
        : [];


    return segments
      .map(
        segment =>
          parseFlexibleDate(
            segment?.departureDate ||
            ''
          ).dateKey
      )
      .filter(
        Boolean
      );
  }


  function flightMatchScore(
    existingService,
    lunaService
  ) {
    const existingRoutes =
      serviceRoutes(
        existingService
      );


    const lunaRoutes =
      serviceRoutes(
        lunaService
      );


    const existingDates =
      serviceDates(
        existingService
      );


    const lunaDates =
      serviceDates(
        lunaService
      );


    let score =
      0;


    lunaRoutes.forEach(
      route => {
        if (
          existingRoutes.includes(
            route
          )
        ) {
          score +=
            5;
        }
      }
    );


    lunaDates.forEach(
      date => {
        if (
          existingDates.includes(
            date
          )
        ) {
          score +=
            2;
        }
      }
    );


    if (
      existingRoutes.length &&
      existingRoutes.length ===
        lunaRoutes.length
    ) {
      score +=
        1;
    }


    return score;
  }


  function isReplaceableFlight(
    service
  ) {
    if (
      service?.category !==
      'flight'
    ) {
      return false;
    }


    if (
      String(
        service?.sourceName ||
        ''
      ).trim()
    ) {
      return false;
    }


    if (
      toNumber(
        service?.cost
      ) !== 0
    ) {
      return false;
    }


    const name =
      String(
        service?.name ||
        ''
      ).trim();


    return [
      'تذاكر الطيران الدولي',
      'تذاكر الطيران الداخلي'
    ].includes(
      name
    );
  }


  function isReplaceableHotel(
    service
  ) {
    if (
      service?.category !==
      'hotel'
    ) {
      return false;
    }


    if (
      !Number.isInteger(
        Number(
          service?.tripStopIndex
        )
      )
    ) {
      return false;
    }


    if (
      String(
        service?.sourceName ||
        ''
      ).trim()
    ) {
      return false;
    }


    if (
      toNumber(
        service?.cost
      ) !== 0
    ) {
      return false;
    }


    const name =
      String(
        service?.name ||
        ''
      ).trim();


    return (
      name.startsWith(
        'فندق في '
      ) ||
      name ===
        'اختيار فندق'
    );
  }


  /*
   * نأخذ نسخة من الإقامات المبدئية قبل أن
   * نبدأ باستبدالها.
   *
   * هذا مهم خصوصاً إذا تكررت نفس المدينة
   * مثل بانكوك في بداية ونهاية الرحلة.
   */
  const hotelSlots =
    state.services
      .filter(
        isReplaceableHotel
      )
      .map(
        service => ({
          tripStopIndex:
            Number(
              service.tripStopIndex
            ),

          city:
            normalizeRouteText(
              service.city
            ),

          checkIn:
            parseFlexibleDate(
              service.checkIn ||
              ''
            ).dateKey,

          checkOut:
            parseFlexibleDate(
              service.checkOut ||
              ''
            ).dateKey
        })
      );


  const replacedFlightIds =
    new Set();


  const replacedHotelIndexes =
    new Set();


  const fallbackHotelIndexes =
    new Set();


  flights.forEach(
    (
      flight,
      index
    ) => {
      const currency =
        String(
          flight?.currency ||
          'SAR'
        )
          .trim()
          .toUpperCase();


      const rawPrice =
        Number(
          flight?.totalPrice
        );


      const cost =
        currency === 'SAR' &&
        Number.isFinite(
          rawPrice
        )
          ? Math.max(
              0,
              rawPrice
            )
          : 0;


      const details =
  String(
    flight?.cabinClass ||
    ''
  ).trim();


      const segments =
        Array.isArray(
          flight?.segments
        )
          ? flight.segments.map(
              segment => {
                const departureDate =
                  parseFlexibleDate(
                    segment?.departureDate ||
                    ''
                  );


                const departureTime =
                  parseFlexibleTime(
                    segment?.departureTime ||
                    ''
                  );


                const arrivalDate =
                  parseFlexibleDate(
                    segment?.arrivalDate ||
                    ''
                  );


                const arrivalTime =
                  parseFlexibleTime(
                    segment?.arrivalTime ||
                    ''
                  );


                const extraDetails = [
                  segment?.duration
                    ? `المدة: ${segment.duration}`
                    : '',

                  Number.isFinite(
                    Number(
                      segment?.stops
                    )
                  )
                    ? (
                        Number(
                          segment.stops
                        ) === 0
                          ? 'مباشر'
                          : `التوقفات: ${segment.stops}`
                      )
                    : ''
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ' | '
                  );


                return createSegment(
                  String(
                    segment?.from ||
                    ''
                  ).trim(),

                  String(
                    segment?.to ||
                    ''
                  ).trim(),

                  departureDate.valid
                    ? departureDate.display
                    : String(
                        segment?.departureDate ||
                        ''
                      ).trim(),

                  departureTime.valid
                    ? departureTime.display
                    : String(
                        segment?.departureTime ||
                        ''
                      ).trim(),

                  arrivalDate.valid
                    ? arrivalDate.display
                    : String(
                        segment?.arrivalDate ||
                        ''
                      ).trim(),

                  arrivalTime.valid
                    ? arrivalTime.display
                    : String(
                        segment?.arrivalTime ||
                        ''
                      ).trim(),

                  0,

                  extraDetails
                );
              }
            )
          : [];


      if (
        !segments.length
      ) {
        segments.push(
          createSegment()
        );
      }


      const lunaService = {
        id:
          `service-luna-flight-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,

        category:
  'flight',

flightType:
  (
    String(
      flight?.flightType ||
      ''
    )
      .trim()
      .toLowerCase() ===
      'domestic' ||

    String(
      flight?.groupKey ||
      ''
    )
      .trim()
      .toLowerCase()
      .startsWith(
        'domestic-'
      )
  )
    ? 'domestic'
    : 'international',

flightGroupKey:
  String(
    flight?.groupKey ||
    ''
  ).trim(),

flightGroupLabel:
  String(
    flight?.groupLabel ||
    ''
  ).trim(),

name:
          [
            flight?.airline,
            flight?.flightNumber
          ]
            .filter(
              Boolean
            )
            .join(
              ' '
            ) ||
          'تذاكر الطيران',

        details,

        costMode:
          'total',

        qty:
          travelerCount,

        cost,

        segments,

        source:
          'luna',

        sourceName:
          String(
            flight?.sourceName ||
            ''
          ).trim(),

        sourceUrl:
          safeLunaSourceUrl(
            flight?.sourceUrl
          ),

        verifiedAt:
          String(
            flight?.verifiedAt ||
            ''
          ).trim()
      };


      const candidates =
        state.services
          .map(
            (
              service,
              serviceIndex
            ) => ({
              service,
              serviceIndex
            })
          )
          .filter(
            candidate =>
              isReplaceableFlight(
                candidate.service
              ) &&
              !replacedFlightIds.has(
                candidate.service.id
              )
          )
          .map(
            candidate => ({
              ...candidate,

              score:
                flightMatchScore(
                  candidate.service,
                  lunaService
                )
            })
          )
          .sort(
            (
              a,
              b
            ) =>
              b.score -
              a.score
          );


      let replacement =
        candidates[0] ||
        null;


      /*
       * إذا كان عندنا أكثر من طيران مبدئي
       * ولا يوجد أي تطابق في المسار أو التاريخ،
       * لا نخمن أي واحد يجب استبداله.
       */
      if (
        replacement &&
        replacement.score === 0 &&
        candidates.length > 1
      ) {
        replacement =
          null;
      }


      if (
        replacement
      ) {
        lunaService.id =
          replacement.service.id;


        state.services[
          replacement.serviceIndex
        ] =
          lunaService;


        replacedFlightIds.add(
          replacement.service.id
        );
      } else {
        state.services.push(
          lunaService
        );
      }
    }
  );


  hotels.forEach(
  (
    hotel,
    index
  ) => {

      const taxesIncluded =
        hotel?.taxesIncluded === true ||
        String(
          hotel?.taxesIncluded
        )
          .trim()
          .toLowerCase() ===
          'true';


      const taxesNotIncluded =
        hotel?.taxesIncluded === false ||
        String(
          hotel?.taxesIncluded
        )
          .trim()
          .toLowerCase() ===
          'false';


      const taxesAmount =
        Number(
          hotel?.taxesAmount
        );


      const importedHotelTax =
        taxesNotIncluded &&
        Number.isFinite(
          taxesAmount
        ) &&
        taxesAmount > 0
          ? taxesAmount
          : 0;


      const city =
        String(
          hotel?.city ||
          'غير محددة'
        ).trim();


      const normalizedCity =
        normalizeRouteText(
          city
        );


      const hotelCheckIn =
        parseFlexibleDate(
          hotel?.checkIn ||
          ''
        );


      const hotelCheckOut =
        parseFlexibleDate(
          hotel?.checkOut ||
          ''
        );


      /*
       * أولاً نحاول معرفة الإقامة من:
       * المدينة + تاريخ الدخول + تاريخ الخروج.
       *
       * وهذا يمنع خلط بانكوك الأولى
       * مع بانكوك الأخيرة.
       */
      const requestedTripStopIndex =
  Number(
    hotel?.tripStopIndex
  );


const requestedTripStop =
  Number.isInteger(
    requestedTripStopIndex
  ) &&
  requestedTripStopIndex >= 0
    ? state.tripStops?.[
        requestedTripStopIndex
      ] ||
      null
    : null;


const requestedStopType =
  requestedTripStop
    ?.stopType ===
      'pass_through'
      ? 'pass_through'
      : 'stay';


const requestedStopNights =
  Number.parseInt(
    requestedTripStop
      ?.nights,
    10
  );


const requestedStopHasNoStay =
  Boolean(
    requestedTripStop
  ) &&
  (
    requestedStopType ===
      'pass_through' ||
    (
      Number.isFinite(
        requestedStopNights
      ) &&
      requestedStopNights <= 0
    )
  );


/*
 * حماية إضافية:
 * إذا أعاد Luna فندقًا لمحطة عبور أو
 * لمحطة لا تحتوي إقامة، نتجاهل الفندق
 * بالكامل بدل نقله إلى إقامة أخرى.
 */
if (
  requestedStopHasNoStay
) {
  return;
}


let matchingSlot =
  null;


/*
 * المطابقة الأولى:
 * tripStopIndex القادم من Luna.
 *
 * هذه هي أدق طريقة لأنها تربط الفندق
 * مباشرة بالإقامة المقصودة حتى لو
 * تكررت نفس المدينة أكثر من مرة.
 */
if (
  Number.isInteger(
    requestedTripStopIndex
  ) &&
  requestedTripStopIndex >=
    0
) {
  matchingSlot =
    hotelSlots.find(
      slot =>
        slot.tripStopIndex ===
          requestedTripStopIndex &&
        !fallbackHotelIndexes.has(
          slot.tripStopIndex
        )
    );
}


/*
 * المطابقة الثانية:
 * تاريخ الدخول + تاريخ الخروج.
 */
if (
  !matchingSlot &&
  hotelCheckIn.dateKey &&
  hotelCheckOut.dateKey
) {
  matchingSlot =
    hotelSlots.find(
      slot =>
        !fallbackHotelIndexes.has(
          slot.tripStopIndex
        ) &&
        slot.checkIn ===
          hotelCheckIn.dateKey &&
        slot.checkOut ===
          hotelCheckOut.dateKey
    );
}


/*
 * المطابقة الثالثة:
 * اسم المدينة.
 */
if (
  !matchingSlot
) {
  matchingSlot =
    hotelSlots.find(
      slot =>
        !fallbackHotelIndexes.has(
          slot.tripStopIndex
        ) &&
        slot.city ===
          normalizedCity
    );
}


/*
 * المطابقة الأخيرة:
 * أول إقامة لم تستخدم بعد.
 */
if (
  !matchingSlot
) {
  matchingSlot =
    hotelSlots.find(
      slot =>
        !fallbackHotelIndexes.has(
          slot.tripStopIndex
        )
    );
}


      const tripStopIndex =
        matchingSlot
          ? matchingSlot.tripStopIndex
          : -1;


      if (
        matchingSlot
      ) {
        fallbackHotelIndexes.add(
          matchingSlot.tripStopIndex
        );
      }


      const currency =
        String(
          hotel?.currency ||
          'SAR'
        )
          .trim()
          .toUpperCase();


      const rawPrice =
        Number(
          hotel?.totalPrice
        );


      const cost =
        currency === 'SAR' &&
        Number.isFinite(
          rawPrice
        )
          ? Math.max(
              0,
              rawPrice
            )
          : 0;



    
      const details =
  shortLunaRoomType(
    hotel?.roomType
  );


      const lunaService = {
        id:
          `service-luna-hotel-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,

        category:
          'hotel',

        city,

name:
  String(
    hotel?.name ||
    `فندق في ${city}`
  ).trim(),

hotelStars:
  hotel?.stars ?? '',

roomType:
  String(
    hotel?.roomType ||
    ''
  ).trim(),

roomSize:
  String(
    hotel?.roomSize ||
    ''
  ).trim(),

board:
  String(
    hotel?.board ||
    ''
  ).trim(),

cancellation:
  shortLunaCancellation(
    hotel?.cancellation
  ),

details,

        checkIn:
          hotelCheckIn.valid
            ? hotelCheckIn.display
            : String(
                hotel?.checkIn ||
                ''
              ).trim(),

        checkInTime:
          '3:00 PM',

        checkOut:
          hotelCheckOut.valid
            ? hotelCheckOut.display
            : String(
                hotel?.checkOut ||
                ''
              ).trim(),

        checkOutTime:
          '12:00 PM',

        hotelTax:
  importedHotelTax,

        costMode:
  'total',

qty:
  travelerCount,

cost,

        source:
          'luna',

        sourceName:
          String(
            hotel?.sourceName ||
            ''
          ).trim(),

        sourceUrl:
          safeLunaSourceUrl(
            hotel?.sourceUrl
          ),

        verifiedAt:
          String(
            hotel?.verifiedAt ||
            ''
          ).trim()
      };


      if (
        tripStopIndex >= 0
      ) {
        lunaService.tripStopIndex =
          tripStopIndex;
      }


      /*
       * أول فندق مختار للإقامة يستبدل
       * الفندق المبدئي.
       *
       * إذا اختار المستخدم أكثر من فندق
       * لنفس الإقامة، نحتفظ بالبقية كخيارات
       * إضافية بدلاً من حذفها.
       */
      const placeholderIndex =
        tripStopIndex >= 0 &&
        !replacedHotelIndexes.has(
          tripStopIndex
        )
          ? state.services.findIndex(
              service =>
                isReplaceableHotel(
                  service
                ) &&
                Number(
                  service.tripStopIndex
                ) ===
                  tripStopIndex
            )
          : -1;


      if (
        placeholderIndex >= 0
      ) {
        lunaService.id =
          state.services[
            placeholderIndex
          ].id;


        state.services[
          placeholderIndex
        ] =
          lunaService;


        replacedHotelIndexes.add(
          tripStopIndex
        );
      } else {
        state.services.push(
          lunaService
        );
      }


      if (
        city &&
        !state.hotelCities.includes(
          city
        )
      ) {
        state.hotelCities.push(
          city
        );
      }
    }
  );


  return {
    flightCount:
      flights.length,

    hotelCount:
      hotels.length
  };
}


/*
 * =========================================================
 * ANALYZE LUNA JSON
 * =========================================================
 */

$('#analyzeLunaJsonBtn')
  ?.addEventListener(
    'click',
    () => {
      try {
        pendingLunaResults =
          parseLunaResults();


        selectedLunaResults
          .flights
          .clear();


        selectedLunaResults
          .hotels
          .clear();


        const flightCount =
          pendingLunaResults
            .flights
            .length;


        const hotelCount =
  pendingLunaResults
    .hotels
    .filter(
      hotel => {
        const tripStopIndex =
          Number(
            hotel
              ?.tripStopIndex
          );


        /*
         * إذا لم يكن هناك رقم محطة صالح،
         * فهذا الفندق ما زال يظهر في النتائج.
         */
        if (
          !Number.isInteger(
            tripStopIndex
          ) ||
          tripStopIndex < 0
        ) {
          return true;
        }


        const tripStop =
          state.tripStops?.[
            tripStopIndex
          ] ||
          null;


        /*
         * إذا لم نجد المحطة،
         * لا نخفي الفندق من العداد.
         */
        if (
          !tripStop
        ) {
          return true;
        }


        const stopType =
          tripStop?.stopType ===
            'pass_through'
            ? 'pass_through'
            : 'stay';


        const parsedNights =
          Number.parseInt(
            tripStop?.nights,
            10
          );


        const hasNoStay =
          stopType ===
            'pass_through' ||
          (
            Number.isFinite(
              parsedNights
            ) &&
            parsedNights <= 0
          );


        return !hasNoStay;
      }
    )
    .length;


        renderLunaResultsPreview(
          pendingLunaResults
        );


        setLunaResultsStatus(
          `تم تحليل ${flightCount} خيار طيران و${hotelCount} خيار فندق`,
          'success'
        );


        closeLunaJsonDialog();


        setTimeout(
          () => {
            openLunaResultsDialog();
          },
          50
        );
      } catch (
        error
      ) {
        pendingLunaResults =
          null;


        console.error(
          '[Luna JSON Import]',
          error
        );


        setLunaResultsStatus(
          error?.message ||
          'تعذر قراءة نتائج Luna',
          'error'
        );
      }
    }
  );


/*
 * =========================================================
 * IMPORT SELECTED LUNA RESULTS
 * =========================================================
 */

$('#importLunaResultsBtn')
  ?.addEventListener(
    'click',
    () => {
      try {
        if (
          !pendingLunaResults
        ) {
          toast(
            'لا توجد نتائج Luna جاهزة للاستيراد'
          );


          closeLunaResultsDialog();


          setTimeout(
            () => {
              openLunaJsonDialog();
            },
            50
          );


          return;
        }


        const selectedResults =
          getSelectedLunaResults();


        const selectedFlightCount =
          selectedResults
            .flights
            .length;


        const selectedHotelCount =
          selectedResults
            .hotels
            .length;


        if (
          !selectedFlightCount &&
          !selectedHotelCount
        ) {
          toast(
            'اختر رحلة أو فندقاً واحداً على الأقل'
          );


          return;
        }


        const imported =
          importSelectedLunaResultsToOffer(
            selectedResults
          );


        renderAll();


        scheduleAutoSave();


        selectedLunaResults
          .flights
          .clear();


        selectedLunaResults
          .hotels
          .clear();


        pendingLunaResults =
          null;


        const preview =
          $('#lunaResultsPreview');


        if (
          preview
        ) {
          preview.innerHTML =
            '';

          preview.hidden =
            true;
        }


        const textarea =
          $('#lunaResultsJson');


        if (
          textarea
        ) {
          textarea.value =
            '';
        }


        closeLunaResultsDialog();


        toast(
          `تم استيراد ${imported.flightCount} طيران و${imported.hotelCount} فندق إلى العرض`
        );
      } catch (
        error
      ) {
        console.error(
          '[Luna Import]',
          error
        );


        toast(
          error?.message ||
          'تعذر استيراد نتائج Luna'
        );
      }
    }
  );
})();
