var buildLocalStorage = function () {
  try {
    var comboId = getParameterByName('comboId') || getParameterByName('comboid');
    var gclid = getParameterByName('gclid');
    var fbclid = getParameterByName('fbclid');

    // Check for comboId, gclid, fbclid
    if (comboId !== null) {
      var previousComboId = getWithExpiry('_bfl_combo_id');
      // if (previousComboId === null) {
      setWithExpiry('_bfl_combo_id', comboId, 30);
      // }
    }
    if (gclid !== null) {
      var previousGclid = getWithExpiry('_bfl_gclid');
      // if (previousGclid === null) {
      setWithExpiry('_bfl_gclid', gclid, 30);
      // }
    }
    if (fbclid !== null) {
      var previousFbclid = getWithExpiry('_bfl_fbclid');
      // if (previousFbclid === null) {
      setWithExpiry('_bfl_fbclid', fbclid, 30);
      // }
    }
  } catch (error) {
    console.error('Build Local Storage', error);
  }
};

var getParameterByName = function (name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

var setWithExpiry = function (key, value, ttl) {
  try {
    var now = new Date();
    // `item` is an object which contains the original value
    // as well as the time when it's supposed to expire
    var item = {
      value: value,
      expiry: now.setDate(now.getDate() + ttl),
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('setWithExpiry', error);
  }
};

var getWithExpiry = function (key) {
  try {
    var itemStr = localStorage.getItem(key);
    // If the item doesn't exist, return null
    if (!itemStr) {
      return null;
    }
    var item = JSON.parse(itemStr);
    var now = new Date();
    // Compare the expiry time of the item with the current time
    if (now.getTime() > item.expiry) {
      // If the item is expired, delete the item from storage
      // and return null
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (error) {
    console.error('getWithExpiry', error);
    return null;
  }
};

var generateV4GUID = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

var FormWizard = function (prop_element) {
  // Show form if javascript is enabled
  document.querySelector('.nojs').style.display = 'block';
  var element = prop_element;
  var steps = element.querySelectorAll('.js-step');
  var formControls = element.querySelectorAll('.js-form-control');
  var btnPrev = element.querySelector('.js-btn-prev');
  var btnNext = element.querySelector('.js-btn-next');
  var progressBar = element.querySelector('.js-progress-bar');
  var currentStepIdx = 0;
  var externalId = generateV4GUID();
  var previousExternalId = getWithExpiry('_bfl_external_id');
  if (previousExternalId == null) {
    setWithExpiry('_bfl_external_id', externalId, 1);
  } else {
    externalId = previousExternalId;
  }

  var init = function () {
    loadScripts();

    showStep(currentStepIdx);

    addEvents();
  };

  var showStep = function (prop_stepIdx) {
    var stepIdx = prop_stepIdx;

    steps[stepIdx].classList.add('is-active');
    btnPrev.classList[stepIdx === 0 ? 'remove' : 'add']('is-active');
    btnNext.innerText = btnNext.dataset[stepIdx === steps.length - 1 ? 'finalStepText' : 'stepText'];

    if (currentStepIdx == 0) btnNext.innerText = 'SEE IF I QUALIFY';

    if (currentStepIdx >= 1) element.querySelector('.tcpa-container').style.display = 'none';

    updateProgressBar(stepIdx);
  };

  var prevNext = function (prop_value) {
    var value = prop_value;

    if (value === 1 && !validate()) {
      return false;
    }

    steps[currentStepIdx].classList.remove('is-active');
    currentStepIdx += value;

    if (currentStepIdx >= 1) {
      var event = new CustomEvent('bflSubmit', {
        bubbles: true,
      });
      element.dispatchEvent(event);

      if (currentStepIdx >= steps.length) {
        var stepsContainer = element.querySelector('.steps-container');
        stepsContainer.style.display = 'none';
        var thankYouContainer = element.querySelector('.thank-you-container-appointment-scheduled');
        thankYouContainer.style.display = 'block';
        thankYouContainer.scrollIntoView();
        return false;
      }
    }

    showStep(currentStepIdx);
  };

  var validate = function () {
    var currentStepRequiredElements = steps[currentStepIdx].querySelectorAll('[required]');
    var errorDiv = element.querySelector('.error-message-container');
    var valid = true;

    for (var index = 0; index < currentStepRequiredElements.length; index++) {
      if (!currentStepRequiredElements[index].checkValidity()) {
        currentStepRequiredElements[index].closest('.js-input-group').classList.add('has-error');
        valid = false;
      }
    }

    if (valid) {
      errorDiv.style.display = 'none';
    } else {
      errorDiv.style.display = 'block';
      console.error('Form is invalid');
    }

    return valid;
  };

  var clearErrors = function (e) {
    e.target.closest('.js-input-group').classList.remove('has-error');
  };

  var updateProgressBar = function (prop_stepIdx) {
    var percentage = prop_stepIdx / steps.length;

    progressBar.style.transform = percentage === 0 ? 'scaleX(0.01)' : 'scaleX(' + percentage + ')';
  };

  var encodeQueryData = function (data) {
    var ret = [];
    for (var d in data) {
      ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
    }
    return ret.join('&');
  };

  var submit = function (e) {
    var stepsContainer = element.querySelector('.steps-container');
    var url = new URL(window.location.href);
    var kibanaIndexName = 'form_backup_' + url.host.replace(/[^a-z]/gi, '_').toLowerCase();
    var data = [];
    var inputs = steps[currentStepIdx - 1].querySelectorAll('input, select, textarea');
    var jsonData = '{';
    for (var index = 0; index < inputs.length; index++) {
      var input = inputs[index];
      if (input.name !== '') {
        if (input.type === 'radio') {
          if (input.checked) {
            jsonData += '"' + input.name + '"' + ':' + '"' + input.value + '"' + ',';
          }
        } else {
          jsonData += '"' + input.name + '"' + ':' + '"' + input.value + '"' + ',';
        }
      }
    }
    jsonData = jsonData.substring(0, jsonData.length - 1);
    jsonData += '}';
    data = JSON.parse(jsonData);

    if (currentStepIdx - 1 === 0) {
      // Get Local Storage Items
      var previousExternalId = getWithExpiry('_bfl_external_id');
      if (previousExternalId !== null) {
        data.external_Id = previousExternalId;
      } else {
        data.external_Id = externalId;
      }
      var previousComboId = getWithExpiry('_bfl_combo_id');
      if (previousComboId !== null) {
        data.comboId = previousComboId;
      } else {
        var comboId = getParameterByName('comboId') || getParameterByName('comboid');
        if (comboId !== null) data.comboId = comboId;
      }
      var previousGclid = getWithExpiry('_bfl_gclid');
      if (previousGclid !== null) {
        data.gclid = previousGclid;
      } else {
        var gclid = getParameterByName('gclid');
        if (gclid !== null) data.gclid = gclid;
      }
      var previousFbclid = getWithExpiry('_bfl_fbclid');
      if (previousFbclid !== null) {
        data.fbclid = previousFbclid;
      } else {
        var fbclid = getParameterByName('fbclid');
        if (fbclid !== null) data.fbclid = fbclid;
      }

      data.navigator = navigator.userAgent;
      data.endpointToken = element.action;
      data.url = url;
    }

    // Check Homeowner answer
    if (currentStepIdx - 1 === 1) {
      if (data.homeowner !== 'yes') {
        stepsContainer.style.display = 'none';
        element.querySelector('.thank-you-container-needs-call').style.display = 'block';
        data.selfBookFailed = true;
        data.failedForm = true;
      }
    }

    // Check Street Address answer
    if (currentStepIdx - 1 === 2) {
      var address = getWithExpiry('_bfl_google_address');
      if (address !== null) {
        data.googleMaps = {};
        address.find(function (addressInfo) {
          if (addressInfo.types instanceof Array && addressInfo.types.indexOf('administrative_area_level_1') === 0) {
            data.googleMaps.state = addressInfo.long_name;
          }
          if (addressInfo.types instanceof Array && addressInfo.types.indexOf('locality') === 0) {
            data.googleMaps.city = addressInfo.long_name;
          }
          if (addressInfo.types instanceof Array && addressInfo.types.indexOf('postal_code') === 0) {
            data.googleMaps.zip = addressInfo.long_name;
          }
          if (typeof addressInfo === 'string') {
            data.googleMaps.street = addressInfo;
          }
        });
      }
    }

    // Check Income answer
    if (currentStepIdx - 1 === 4) {
      if (data.estimatedIncome !== 'Above $40,000') {
        stepsContainer.style.display = 'none';
        element.querySelector('.thank-you-container-needs-call').style.display = 'block';
        data.selfBookFailed = true;
        data.failedForm = true;
      }
    }

    // Check Credit Score answer
    if (currentStepIdx - 1 === 5) {
      if (data.credit !== 'Above 640') {
        stepsContainer.style.display = 'none';
        element.querySelector('.thank-you-container-needs-call').style.display = 'block';
        data.selfBookFailed = true;
        data.failedForm = true;
      }
    }

    // Check Housing answer
    if (currentStepIdx - 1 === 6) {
      if (data.homeType !== 'Single Family Home') {
        stepsContainer.style.display = 'none';
        element.querySelector('.thank-you-container-needs-call').style.display = 'block';
        data.selfBookFailed = true;
        data.failedForm = true;
      }
    }

    data.timestamp = new Date();

    console.log(data);
  };

  var loadScripts = function () {
    // Lead ID script
    if (
      !Array.from(document.querySelectorAll('script')).some(function (elm) {
        return elm.id == 'LeadiDscript_campaign';
      })
    ) {
      var script = document.createElement('script');
      script.id = 'LeadiDscript_campaign';
      script.type = 'text/javascript';
      script.src = 'https://create.lidstatic.com/campaign/b44a9de7-2fa6-09b1-944e-11ea2f41920c.js?snippet_version=2';
      script.async = true;
      document.getElementsByTagName('head')[0].appendChild(script);
    }
    // Page ID script
    if (
      !Array.from(document.querySelectorAll('script')).some(function (elm) {
        return elm.id == 'pageid_script';
      })
    ) {
      var pageid_aid = '146808178';
      var script = document.createElement('script');
      script.id = 'pageid_script';
      script.type = 'text/javascript';
      script.src = 'https://cdn.pageid.info/js/pageid.js';
      script.async = true;
      document.getElementsByTagName('head')[0].appendChild(script);
    }
    // Optin Cert script
    if (
      !Array.from(document.querySelectorAll('script')).some(function (elm) {
        return elm.id == 'optin_cert_script';
      })
    ) {
      var field = 'optin_cert';
      var provideReferrer = false;
      var script = document.createElement('script');
      script.id = 'optin_cert_script';
      script.type = 'text/javascript';
      script.async = true;
      script.src =
        'http' +
        ('https:' == document.location.protocol ? 's' : '') +
        '://api.trustedform.com/trustedform.js?provide_referrer=' +
        escape(provideReferrer) +
        '&field=' +
        escape(field) +
        '&l=' +
        new Date().getTime() +
        Math.random();
      document.getElementsByTagName('head')[0].appendChild(script);
    }
  };

  var addEvents = function () {
    for (var index = 0; index < formControls.length; index++) {
      formControls[index].addEventListener('keyup', clearErrors.bind(this));
      formControls[index].addEventListener('change', clearErrors.bind(this));
    }

    btnPrev.addEventListener('click', prevNext.bind(this, -1));
    btnNext.addEventListener('click', prevNext.bind(this, 1));
    element.addEventListener('bflSubmit', submit.bind(this));

    var autocompleteInput = element.querySelector('.googleAutocomplete');
    if (autocompleteInput) {
      var autocomplete = new google.maps.places.Autocomplete(autocompleteInput);
      google.maps.event.addListener(autocomplete, 'place_changed', function () {
        var place = autocomplete.getPlace();
        var addressComponents = place.address_components;
        var formattedAddress = place.formatted_address;
        addressComponents.push(formattedAddress);

        setWithExpiry('_bfl_google_address', addressComponents, 1);
      });
    } else {
      throw new Error(
        "The element with a class .googleAutocomplete has not been found. Please, check if you've set it correctly."
      );
    }
  };

  // Initialize
  init();
};

// ---

window.addEventListener('DOMContentLoaded', function () {
  buildLocalStorage();

  window.formWizardObjs = {};
  var formWizards = document.querySelectorAll('.js-form-wizard');
  if (formWizards.length !== 0) {
    for (var index = 0; index < formWizards.length; index++) {
      formWizardObjs[formWizards[index].id] = new FormWizard(formWizards[index]);
    }
  }
});
