(() => {
  'use strict';


  const API =
    'https://konoozagent.khaledsan201031.workers.dev';


  const $ =
    selector =>
      document.querySelector(
        selector
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