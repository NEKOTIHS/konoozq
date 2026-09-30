(() => {
  'use strict';


  const API =
    'https://konoozagent.khaledsan201031.workers.dev';


  const $ =
    selector =>
      document.querySelector(
        selector
      );


      function openImportIntakeDialog() {
  const dialog =
    $('#importIntakeDialog');


  if (
    !dialog
  ) {
    return;
  }


  dialog.showModal();


  setTimeout(
    () => {
      $('#importIntakeCode')
        ?.focus();
    },
    0
  );
}


function closeImportIntakeDialog() {
  const dialog =
    $('#importIntakeDialog');


  if (
    !dialog
  ) {
    return;
  }


  dialog.close();


  const status =
    $('#importIntakeStatus');


  if (
    status
  ) {
    status.hidden =
      true;

    status.textContent =
      '';
  }
}


$('#openImportIntakeBtn')
  ?.addEventListener(
    'click',
    openImportIntakeDialog
  );


$('#closeImportIntakeBtn')
  ?.addEventListener(
    'click',
    closeImportIntakeDialog
  );


$('#cancelImportIntakeBtn')
  ?.addEventListener(
    'click',
    closeImportIntakeDialog
  );


  function setImportIntakeStatus(
  message,
  type = ''
) {
  const status =
    $('#importIntakeStatus');


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


function setIntakeFieldValue(
  id,
  value
) {
  const field =
    $(`#${id}`);


  if (
    !field
  ) {
    return;
  }


  field.value =
    value == null
      ? ''
      : String(
          value
        );
}


function parseImportedChildAges(
  value
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .map(
        age =>
          String(
            age
          ).trim()
      )
      .filter(
        Boolean
      );
  }


  return String(
    value ||
    ''
  )
    .split(',')
    .map(
      age =>
        age.trim()
    )
    .filter(
      Boolean
    );
}


function parseImportedTripStops(
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
      '[Import Intake Trip Stops]',
      error
    );


    return [];
  }
}


function fillImportedIntake(
  intake
) {
  setIntakeFieldValue(
    'clientName',
    intake.client_name
  );


  setIntakeFieldValue(
    'phone',
    intake.phone
  );


  setIntakeFieldValue(
    'email',
    intake.email
  );


  setIntakeFieldValue(
    'origin',
    intake.origin
  );


  setIntakeFieldValue(
    'destination',
    intake.destination
  );


  setIntakeFieldValue(
    'startDate',
    intake.start_date
  );


  setIntakeFieldValue(
    'endDate',
    intake.end_date
  );


  setIntakeFieldValue(
    'adults',
    Math.max(
      1,
      Number(
        intake.adults ||
        1
      )
    )
  );


  const childAges =
    parseImportedChildAges(
      intake.child_ages
    );


  const children =
    Math.max(
      0,
      Number(
        intake.children ||
        childAges.length ||
        0
      )
    );


  setIntakeFieldValue(
    'children',
    children
  );


  renderChildAgeFields();


  const childAgeInputs =
    [
      ...document.querySelectorAll(
        '.child-age-input'
      )
    ];


  childAgeInputs.forEach(
    (
      input,
      index
    ) => {
      input.value =
        childAges[index] ??
        '';
    }
  );


  setIntakeFieldValue(
    'budget',
    intake.budget
  );


  setIntakeFieldValue(
    'hotelStars',
    intake.hotel_stars
  );


  setIntakeFieldValue(
    'flightClass',
    intake.flight_class
  );


  setIntakeFieldValue(
    'tripStyle',
    intake.trip_style
  );


  setIntakeFieldValue(
    'notes',
    intake.notes
  );


  const tripStops =
    parseImportedTripStops(
      intake.trip_stops
    );


  const tripStopsList =
    $('#tripStopsList');


  if (
    tripStopsList
  ) {
    tripStopsList.innerHTML =
      '';
  }


  tripStops.forEach(
  stop => {
    const importedAreas =
      Array.isArray(
        stop?.areas
      )
        ? stop.areas
        : [];


    const rawStopType =
      String(
        stop?.stopType ||
        'stay'
      ).trim();


    const stopType =
      [
        'stay',
        'group',
        'pass_through'
      ].includes(
        rawStopType
      )
        ? rawStopType
        : 'stay';


    const parsedCityNights =
      Number.parseInt(
        stop?.nights,
        10
      );


    const cityNights =
      stopType ===
        'stay'
        ? (
            Number.isFinite(
              parsedCityNights
            )
              ? Math.max(
                  1,
                  parsedCityNights
                )
              : 1
          )
        : 0;


    addTripStop({
      city:
        String(
          stop?.city ||
          ''
        ).trim(),

      stopType,

      nights:
        cityNights,

      transport:
        String(
          stop?.transportToNext ||
          'best'
        ).trim(),

      areas:
        importedAreas.map(
          areaItem => {
            const areaStopType =
              areaItem?.stopType ===
                'pass_through'
                ? 'pass_through'
                : 'stay';


            const parsedAreaNights =
              Number.parseInt(
                areaItem?.nights,
                10
              );


            return {
              area:
                String(
                  areaItem?.area ||
                  areaItem?.name ||
                  ''
                ).trim(),

              stopType:
                areaStopType,

              nights:
                areaStopType ===
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
                    ),

              transportToNext:
                String(
                  areaItem?.transportToNext ||
                  areaItem?.transport ||
                  'best'
                ).trim()
            };
          }
        )
    });
  }
);


  refreshTripStopsUI();


  syncTripDates();
}


$('#loadImportIntakeBtn')
  ?.addEventListener(
    'click',
    async () => {
      const code =
        $('#importIntakeCode')
          ?.value
          ?.trim() ||
        '';


      const phone =
        $('#importIntakePhone')
          ?.value
          ?.trim() ||
        '';


      if (
        !code ||
        !phone
      ) {
        setImportIntakeStatus(
          'أدخل رقم الطلب ورقم الجوال المسجل في الطلب.',
          'error'
        );


        return;
      }


      const button =
        $('#loadImportIntakeBtn');


      const originalText =
        button?.textContent ||
        'استيراد الطلب';


      if (
        button
      ) {
        button.disabled =
          true;


        button.textContent =
          'جاري الاستيراد...';
      }


      setImportIntakeStatus(
        'جاري البحث عن الطلب...'
      );


      try {
        const response =
          await fetch(
            `${API}/intakes/lookup`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  code,
                  phone
                })
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
          !response.ok
        ) {
          throw new Error(
            result?.error ||
            'تعذر العثور على الطلب'
          );
        }


        if (
          !result?.intake
        ) {
          throw new Error(
            'بيانات الطلب غير مكتملة'
          );
        }


        fillImportedIntake(
          result.intake
        );


        setImportIntakeStatus(
          'تم استيراد بيانات الطلب بنجاح.',
          'success'
        );


        setTimeout(
          () => {
            closeImportIntakeDialog();
          },
          500
        );
      } catch (
        error
      ) {
        console.error(
          '[Import Previous Intake]',
          error
        );


        setImportIntakeStatus(
          error?.message ||
          'تعذر استيراد الطلب',
          'error'
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
  

      function renderChildAgeFields() {
  const childrenInput =
    $('#children');


  const wrap =
    $('#childAgesWrap');


  const fields =
    $('#childAgesFields');


  if (
    !childrenInput ||
    !wrap ||
    !fields
  ) {
    return;
  }


  const count =
    Math.max(
      0,
      Math.min(
        50,
        Number.parseInt(
          childrenInput.value,
          10
        ) ||
        0
      )
    );


  if (
    count ===
      0
  ) {
    wrap.hidden =
      true;


    fields.innerHTML =
      '';


    return;
  }


  wrap.hidden =
    false;


  fields.innerHTML =
    Array.from(
      {
        length:
          count
      },

      (
        _,
        index
      ) => `
        <label>
          <span>
            عمر الطفل ${index + 1}
          </span>

          <input
  class="child-age-input"
  type="number"
  min="0"
  max="17"
  inputmode="numeric"
  placeholder="العمر"
  aria-label="عمر الطفل ${index + 1}"
  required
>
        </label>
      `
    )
      .join('');
}


$('#children')
  ?.addEventListener(
    'input',
    renderChildAgeFields
  );


renderChildAgeFields();
function syncTripDates() {
  const startDate =
    $('#startDate');


  const endDate =
    $('#endDate');


  if (
    !startDate ||
    !endDate
  ) {
    return;
  }


  if (
    startDate.value
  ) {
    endDate.min =
      startDate.value;
  } else {
    endDate.removeAttribute(
      'min'
    );
  }


  if (
    startDate.value &&
    endDate.value &&
    endDate.value <
      startDate.value
  ) {
    endDate.value =
      '';
  }
}


$('#startDate')
  ?.addEventListener(
    'change',
    syncTripDates
  );


$('#endDate')
  ?.addEventListener(
    'change',
    syncTripDates
  );


syncTripDates();
function normalizeTripTransport(
  value,
  fallback = 'best'
) {
  const allowedTransport = [
    'best',
    'domestic_flight',
    'private_car',
    'train',
    'ferry',
    'boat',
    'shared_transfer',
    'no_preference'
  ];


  const normalized =
    String(
      value ||
      ''
    ).trim();


  return allowedTransport.includes(
    normalized
  )
    ? normalized
    : fallback;
}


function syncTripStopType(
  tripStopCard
) {
  if (
    !tripStopCard
  ) {
    return;
  }


  const stopTypeInput =
    tripStopCard.querySelector(
      '.trip-stop-type'
    );


  const nightsWrap =
    tripStopCard.querySelector(
      '.trip-stop-nights-wrap'
    );


  const nightsInput =
    tripStopCard.querySelector(
      '.trip-stop-nights'
    );


const transportLabel =
  tripStopCard.querySelector(
    '.trip-stop-transport-wrap > span'
  );


  const stopType =
    String(
      stopTypeInput?.value ||
      'stay'
    ).trim();


  const needsNights =
    stopType ===
      'stay';


      if (
  transportLabel
) {
  transportLabel.textContent =
    stopType ===
      'group'
      ? 'الانتقال بعد آخر منطقة'
      : 'الانتقال إلى المحطة التالية';
}



  if (
  nightsWrap
) {
  nightsWrap.hidden =
    !needsNights;


  nightsWrap.style.display =
    needsNights
      ? ''
      : 'none';
}


  if (
    !nightsInput
  ) {
    return;
  }


  if (
  !needsNights
) {
  nightsInput.value =
    '0';

  nightsInput.disabled =
    true;

  return;
}


nightsInput.disabled =
  false;


  const currentNights =
    Number.parseInt(
      nightsInput.value,
      10
    );


  /*
   * عند العودة إلى "إقامة"
   * نضمن وجود ليلة واحدة على الأقل.
   */
  if (
    !Number.isFinite(
      currentNights
    ) ||
    currentNights < 1
  ) {
    nightsInput.value =
      '1';
  }
}


function refreshTripStopsUI() {
  const cards =
    [
      ...document.querySelectorAll(
        '.trip-stop-card'
      )
    ];


  cards.forEach(
    (
      card,
      index
    ) => {
      const number =
        card.querySelector(
          '.trip-stop-number'
        );


      const removeButton =
        card.querySelector(
          '.trip-stop-remove-btn'
        );


      if (
        number
      ) {
        number.textContent =
          `المدينة ${index + 1}`;
      }


      if (
        removeButton
      ) {
        removeButton.title =
          `حذف المدينة ${index + 1}`;
      }


      refreshTripAreasUI(
        card
      );
      syncTripStopType(
  card
);
    }
  );
}


function syncTripAreaStopType(
  areaCard
) {
  if (
    !areaCard
  ) {
    return;
  }


  const stopTypeInput =
    areaCard.querySelector(
      '.trip-area-stop-type'
    );


  const nightsWrap =
    areaCard.querySelector(
      '.trip-area-nights-wrap'
    );


  const nightsInput =
    areaCard.querySelector(
      '.trip-area-nights'
    );


  const stopType =
    String(
      stopTypeInput?.value ||
      'stay'
    ).trim();


  const isPassThrough =
    stopType ===
    'pass_through';


  if (
  nightsWrap
) {
  nightsWrap.hidden =
    isPassThrough;


  nightsWrap.style.display =
    isPassThrough
      ? 'none'
      : '';
}


  if (
  nightsInput
) {
  nightsInput.disabled =
    isPassThrough;


  if (
    isPassThrough
  ) {
    nightsInput.value =
      '0';
  } else {
    nightsInput.disabled =
      false;
      const currentNights =
        Number.parseInt(
          nightsInput.value,
          10
        );


      if (
        !Number.isFinite(
          currentNights
        ) ||
        currentNights < 1
      ) {
        nightsInput.value =
          '1';
      }
    }
  }
}


function refreshTripAreasUI(
  tripStopCard
) {
  if (
    !tripStopCard
  ) {
    return;
  }


  const areaCards =
    [
      ...tripStopCard.querySelectorAll(
        '.trip-area-card'
      )
    ];


  areaCards.forEach(
    (
      areaCard,
      index
    ) => {
      const areaInput =
        areaCard.querySelector(
          '.trip-area-name'
        );


      const removeButton =
        areaCard.querySelector(
          '.trip-area-remove-btn'
        );


      if (
        areaInput
      ) {
        areaInput.setAttribute(
          'aria-label',
          `المنطقة ${index + 1}`
        );
      }


      if (
        removeButton
      ) {
        removeButton.title =
          `حذف المنطقة ${index + 1}`;
      }


      syncTripAreaStopType(
        areaCard
      );
    }
  );
}


function addTripArea(
  tripStopCard,
  {
    area = '',
    stopType = 'stay',
    nights = 1,
    transport = 'best'
  } = {}
) {
  const template =
    $('#tripAreaTemplate');


  const list =
    tripStopCard
      ?.querySelector(
        '.trip-areas-list'
      );


  if (
    !template ||
    !list
  ) {
    return;
  }


  const fragment =
    template.content
      .cloneNode(
        true
      );


  const areaCard =
    fragment.querySelector(
      '.trip-area-card'
    );


  const areaInput =
    fragment.querySelector(
      '.trip-area-name'
    );


  const stopTypeInput =
    fragment.querySelector(
      '.trip-area-stop-type'
    );


  const nightsInput =
    fragment.querySelector(
      '.trip-area-nights'
    );


  const transportInput =
    fragment.querySelector(
      '.trip-area-transport'
    );


  const normalizedStopType =
    stopType ===
      'pass_through'
      ? 'pass_through'
      : 'stay';


  if (
    areaInput
  ) {
    areaInput.value =
      String(
        area ||
        ''
      ).trim();
  }


  if (
    stopTypeInput
  ) {
    stopTypeInput.value =
      normalizedStopType;
  }


  if (
    nightsInput
  ) {
    if (
      normalizedStopType ===
        'pass_through'
    ) {
      nightsInput.value =
        '0';
    } else {
      nightsInput.value =
        String(
          Math.max(
            1,
            Number.parseInt(
              nights,
              10
            ) ||
            1
          )
        );
    }
  }


  if (
    transportInput
  ) {
    transportInput.value =
      normalizeTripTransport(
        transport
      );
  }


  list.appendChild(
    fragment
  );


  refreshTripAreasUI(
    tripStopCard
  );


  return areaCard;
}


function addTripStop(
  {
    city = '',
    stopType = 'stay',
    nights = 2,
    transport = 'best',
    areas = []
  } = {}
) {
  const template =
    $('#tripStopTemplate');


  const list =
    $('#tripStopsList');


  if (
    !template ||
    !list
  ) {
    return;
  }


  const fragment =
    template.content
      .cloneNode(
        true
      );


  const card =
    fragment.querySelector(
      '.trip-stop-card'
    );


  const cityInput =
  fragment.querySelector(
    '.trip-stop-city'
  );


const stopTypeInput =
  fragment.querySelector(
    '.trip-stop-type'
  );


const nightsInput =
  fragment.querySelector(
    '.trip-stop-nights'
  );


  const transportInput =
    fragment.querySelector(
      '.trip-stop-transport'
    );


  if (
    cityInput
  ) {
    cityInput.value =
      String(
        city ||
        ''
      ).trim();
  }
  const normalizedStopType =
  [
    'stay',
    'group',
    'pass_through'
  ].includes(
    stopType
  )
    ? stopType
    : 'stay';


if (
  stopTypeInput
) {
  stopTypeInput.value =
    normalizedStopType;
}


  const parsedNights =
  Number.parseInt(
    nights,
    10
  );


const cityNights =
  normalizedStopType ===
    'stay'
    ? (
        Number.isFinite(
          parsedNights
        )
          ? Math.max(
              1,
              parsedNights
            )
          : 2
      )
    : 0;


  if (
    nightsInput
  ) {
    nightsInput.value =
      String(
        cityNights
      );
  }


  if (
    transportInput
  ) {
    transportInput.value =
      normalizeTripTransport(
        transport
      );
  }


  list.appendChild(
    fragment
  );


  const normalizedAreas =
    Array.isArray(
      areas
    )
      ? areas
      : [];


  normalizedAreas.forEach(
    areaItem => {
      addTripArea(
  card,
  {
    area:
      String(
        areaItem?.area ||
        areaItem?.name ||
        ''
      ).trim(),

    stopType:
      areaItem?.stopType ===
        'pass_through'
        ? 'pass_through'
        : 'stay',

    nights:
      areaItem?.stopType ===
        'pass_through'
        ? 0
        : Math.max(
            1,
            Number.parseInt(
              areaItem?.nights,
              10
            ) ||
            1
          ),

    transport:
      normalizeTripTransport(
        areaItem?.transportToNext ||
        areaItem?.transport ||
        'best'
      )
  }
);
    }
  );


  refreshTripStopsUI();


    card
    ?.querySelector(
      '.trip-stop-city'
    )
    ?.focus();
}


$('#addTripStopBottomBtn')
  ?.addEventListener(
    'click',
    () => {
      addTripStop();
    }
  );


$('#tripStopsList')
  ?.addEventListener(
    'click',
    event => {
      const addAreaButton =
        event.target.closest(
          '.trip-area-add-btn'
        );
$('#tripStopsList')
  ?.addEventListener(
    'change',
    event => {
      const stopTypeInput =
        event.target.closest(
          '.trip-area-stop-type'
        );
$('#addTripStopBottomBtn')
  ?.addEventListener(
    'click',
    () => {
      addTripStop();
    }
  );

      if (
        !stopTypeInput
      ) {
        return;
      }


      const areaCard =
        stopTypeInput.closest(
          '.trip-area-card'
        );


      syncTripAreaStopType(
        areaCard
      );
    }
  );


$('#tripStopsList')
  ?.addEventListener(
    'change',
    event => {
      const stopTypeInput =
        event.target.closest(
          '.trip-stop-type'
        );


      if (
        !stopTypeInput
      ) {
        return;
      }


      const tripStopCard =
        stopTypeInput.closest(
          '.trip-stop-card'
        );


      syncTripStopType(
        tripStopCard
      );
    }
  );

      if (
        addAreaButton
      ) {
        const card =
          addAreaButton.closest(
            '.trip-stop-card'
          );


        const areaCard =
          addTripArea(
            card
          );


        areaCard
          ?.querySelector(
            '.trip-area-name'
          )
          ?.focus();


        return;
      }


      const removeAreaButton =
        event.target.closest(
          '.trip-area-remove-btn'
        );


      if (
        removeAreaButton
      ) {
        const tripStopCard =
          removeAreaButton.closest(
            '.trip-stop-card'
          );


        const areaCard =
          removeAreaButton.closest(
            '.trip-area-card'
          );


        areaCard?.remove();


        refreshTripAreasUI(
          tripStopCard
        );


        return;
      }


      const removeCityButton =
        event.target.closest(
          '.trip-stop-remove-btn'
        );


      if (
        removeCityButton
      ) {
        const card =
          removeCityButton.closest(
            '.trip-stop-card'
          );


        card?.remove();


        refreshTripStopsUI();


        return;
      }
    }
  );





refreshTripStopsUI();


/* =========================================================
   TRIP STOPS + AREAS SORTING
   ========================================================= */

const tripStopsList =
  $('#tripStopsList');


let activeTripDrag =
  null;


function getTripDragData(
  handle
) {
  if (
    handle.classList.contains(
      'trip-stop-drag-handle'
    )
  ) {
    const item =
      handle.closest(
        '.trip-stop-card'
      );


    const container =
      $('#tripStopsList');


    if (
      !item ||
      !container
    ) {
      return null;
    }


    return {
      type:
        'city',

      item,

      container,

      handle
    };
  }


  if (
    handle.classList.contains(
      'trip-area-drag-handle'
    )
  ) {
    const item =
      handle.closest(
        '.trip-area-card'
      );


    const container =
      handle.closest(
        '.trip-areas-list'
      );


    if (
      !item ||
      !container
    ) {
      return null;
    }


    return {
      type:
        'area',

      item,

      container,

      handle
    };
  }


  return null;
}


function getTripSortableItems(
  drag
) {
  if (
    !drag
  ) {
    return [];
  }


  const selector =
    drag.type ===
      'city'
      ? ':scope > .trip-stop-card'
      : ':scope > .trip-area-card';


  return [
    ...drag.container.querySelectorAll(
      selector
    )
  ].filter(
    item =>
      item !==
      drag.item
  );
}


function moveTripDraggedItem(
  clientY
) {
  if (
    !activeTripDrag
  ) {
    return;
  }


  const items =
    getTripSortableItems(
      activeTripDrag
    );


  let nextItem =
    null;


  for (
    const item
    of items
  ) {
    const rect =
      item.getBoundingClientRect();


    const middle =
      rect.top +
      rect.height / 2;


    if (
      clientY <
      middle
    ) {
      nextItem =
        item;

      break;
    }
  }


  if (
    nextItem
  ) {
    activeTripDrag.container
      .insertBefore(
        activeTripDrag.item,
        nextItem
      );
  } else {
    activeTripDrag.container
      .appendChild(
        activeTripDrag.item
      );
  }
}


function finishTripDrag() {
  if (
    !activeTripDrag
  ) {
    return;
  }


  activeTripDrag.item
    .classList.remove(
      'is-dragging'
    );


  document.body
    .classList.remove(
      'trip-sort-active'
    );


  refreshTripStopsUI();


  activeTripDrag =
    null;
}


tripStopsList
  ?.addEventListener(
    'pointerdown',
    event => {
      const handle =
        event.target.closest(
          '.trip-stop-drag-handle, .trip-area-drag-handle'
        );


      if (
        !handle
      ) {
        return;
      }


      if (
        event.pointerType ===
          'mouse' &&
        event.button !==
          0
      ) {
        return;
      }


      const drag =
        getTripDragData(
          handle
        );


      if (
        !drag
      ) {
        return;
      }


      event.preventDefault();


      activeTripDrag = {
        ...drag,

        pointerId:
          event.pointerId
      };


      drag.item
        .classList.add(
          'is-dragging'
        );


      document.body
        .classList.add(
          'trip-sort-active'
        );


      try {
        handle.setPointerCapture(
          event.pointerId
        );
      } catch (
        error
      ) {
        console.warn(
          '[Trip Sort Pointer Capture]',
          error
        );
      }
    }
  );


document.addEventListener(
  'pointermove',
  event => {
    if (
      !activeTripDrag ||
      event.pointerId !==
        activeTripDrag.pointerId
    ) {
      return;
    }


    event.preventDefault();


    moveTripDraggedItem(
      event.clientY
    );


    const edgeSize =
      90;


    if (
      event.clientY <
      edgeSize
    ) {
      window.scrollBy({
        top:
          -14,

        behavior:
          'auto'
      });
    } else if (
      event.clientY >
      window.innerHeight -
        edgeSize
    ) {
      window.scrollBy({
        top:
          14,

        behavior:
          'auto'
      });
    }
  },
  {
    passive:
      false
  }
);


document.addEventListener(
  'pointerup',
  event => {
    if (
      !activeTripDrag ||
      event.pointerId !==
        activeTripDrag.pointerId
    ) {
      return;
    }


    finishTripDrag();
  }
);


document.addEventListener(
  'pointercancel',
  event => {
    if (
      !activeTripDrag ||
      event.pointerId !==
        activeTripDrag.pointerId
    ) {
      return;
    }


    finishTripDrag();
  }
);


function getTripStops() {
  const cards =
    [
      ...document.querySelectorAll(
        '.trip-stop-card'
      )
    ];


  return cards
    .map(
      card => {
        const city =
          card
            .querySelector(
              '.trip-stop-city'
            )
            ?.value
            ?.trim() ||
          '';


        /*
         * نوع المدينة الأساسية فقط:
         * stay = إقامة
         * group = مجموعة مناطق فقط
         * pass_through = عبور فقط
         */
        const rawStopType =
          String(
            card
              .querySelector(
                '.trip-stop-type'
              )
              ?.value ||
            'stay'
          ).trim();


        const stopType =
          [
            'stay',
            'group',
            'pass_through'
          ].includes(
            rawStopType
          )
            ? rawStopType
            : 'stay';


        const rawCityNights =
          Number.parseInt(
            card
              .querySelector(
                '.trip-stop-nights'
              )
              ?.value,
            10
          );


        /*
         * فقط المدينة من نوع إقامة
         * يكون لها عدد ليالٍ.
         *
         * group و pass_through دائمًا 0.
         */
        const nights =
          stopType ===
            'stay'
            ? (
                Number.isFinite(
                  rawCityNights
                )
                  ? Math.max(
                      1,
                      rawCityNights
                    )
                  : 1
              )
            : 0;


        const transportToNext =
          normalizeTripTransport(
            card
              .querySelector(
                '.trip-stop-transport'
              )
              ?.value ||
            'best'
          );


        const areaCards =
          [
            ...card.querySelectorAll(
              '.trip-area-card'
            )
          ];


        const areas =
          areaCards
            .map(
              areaCard => {
                const area =
                  areaCard
                    .querySelector(
                      '.trip-area-name'
                    )
                    ?.value
                    ?.trim() ||
                  '';


                /*
                 * المنطقة لا تعرف group.
                 * فقط إقامة أو عبور.
                 */
                const areaStopType =
                  areaCard
                    .querySelector(
                      '.trip-area-stop-type'
                    )
                    ?.value ===
                      'pass_through'
                    ? 'pass_through'
                    : 'stay';


                const rawAreaNights =
                  Number.parseInt(
                    areaCard
                      .querySelector(
                        '.trip-area-nights'
                      )
                      ?.value,
                    10
                  );


                const areaNights =
                  areaStopType ===
                    'pass_through'
                    ? 0
                    : (
                        Number.isFinite(
                          rawAreaNights
                        )
                          ? Math.max(
                              1,
                              rawAreaNights
                            )
                          : 1
                      );


                const areaTransportToNext =
                  normalizeTripTransport(
                    areaCard
                      .querySelector(
                        '.trip-area-transport'
                      )
                      ?.value ||
                    'best'
                  );


                return {
                  area,

                  stopType:
                    areaStopType,

                  nights:
                    areaNights,

                  transportToNext:
                    areaTransportToNext
                };
              }
            )
            .filter(
              item =>
                item.area
            );


        return {
          city,

          stopType,

          nights,

          transportToNext,

          areas
        };
      }
    )
    .filter(
      stop =>
        stop.city
    );
}

  function value(
    id
  ) {
    return $(`#${id}`)
      ?.value
      ?.trim() ||
      '';
  }


  function setStatus(
    text,
    type = ''
  ) {
    const status =
      $('#intakeStatus');


    if (
      !status
    ) {
      return;
    }


    status.hidden =
      !text;


    status.textContent =
      text;


    status.classList.toggle(
      'is-error',
      type === 'error'
    );


    status.classList.toggle(
      'is-success',
      type === 'success'
    );
  }


  $('#clientIntakeForm')
    ?.addEventListener(
      'submit',

      async event => {
        event.preventDefault();


        const button =
          $('#submitIntakeBtn');


        const originalText =
          button?.textContent ||
          'إرسال طلب الرحلة';


        if (
          button
        ) {
          button.disabled =
            true;


          button.textContent =
            'جاري إرسال الطلب...';
        }


        setStatus(
          'جاري إرسال تفاصيل الرحلة...'
        );


        try {
          const payload = {
            clientName:
              value(
                'clientName'
              ),

            phone:
              value(
                'phone'
              ),

            email:
              value(
                'email'
              ),

            origin:
              value(
                'origin'
              ),

            destination:
              value(
                'destination'
              ),

              tripStops:
  getTripStops(),

            startDate:
              value(
                'startDate'
              ),

            endDate:
              value(
                'endDate'
              ),

            adults:
              Number(
                value(
                  'adults'
                )
              ) ||
              1,

            children:
              Number(
                value(
                  'children'
                )
              ) ||
              0,
childAges:
  [
    ...document.querySelectorAll(
      '.child-age-input'
    )
  ]
    .map(
      input =>
        String(
          input.value ||
          ''
        )
          .trim()
    )
    .filter(
      Boolean
    ),
            budget:
              value(
                'budget'
              ),

            hotelStars:
              value(
                'hotelStars'
              ),

            flightClass:
              value(
                'flightClass'
              ),

            tripStyle:
              value(
                'tripStyle'
              ),

            notes:
              value(
                'notes'
              )
          };


          const response =
            await fetch(
              `${API}/intakes`,
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify(
                    payload
                  )
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
            !response.ok
          ) {
            throw new Error(
              result?.error ||
              'تعذر إرسال الطلب'
            );
          }


          const form =
            $('#clientIntakeForm');


          form?.reset();


          if (
            $('#adults')
          ) {
            $('#adults').value =
              '2';
          }


          if (
            $('#children')
          ) {
            $('#children').value =
              '0';
          }
         renderChildAgeFields();
syncTripDates();


          setStatus(
            `تم استلام طلبك بنجاح. رقم الطلب: ${result.code}`,
            'success'
          );
        } catch (
          error
        ) {
          console.error(
            '[Client Intake]',
            error
          );


          setStatus(
            error?.message ||
            'تعذر إرسال الطلب',
            'error'
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

})();
