// ==UserScript==
// @name          Reorderable favorite tags
// @description   Allow the CPU to overheat when holding down the spacebar
// @author        Shog9
// @namespace     https://github.com/Shog9/
// @version       1.2
// @include       http*://stackoverflow.com/*
// @include       http*://*.stackoverflow.com/*
// @include       http*://dev.stackoverflow.com/*
// @include       http*://askubuntu.com/*
// @include       http*://superuser.com/*
// @include       http*://serverfault.com/*
// @include       http*://mathoverflow.net/*
// @include       http*://*.stackexchange.com/*
// @exclude       http*://chat.*.com/*
// ==/UserScript==

// this serves only to avoid embarassing mistakes caused by inadvertently loading this script onto a page that isn't a Stack Exchange page
var isSEsite = false;
for (var s of document.querySelectorAll("script")) isSEsite = isSEsite||/StackExchange\.ready\(/.test(s.textContent);

// don't bother running this if this isn't a scripted SE page
if (!isSEsite)
{
   return;
}

function with_jquery(f) 
{
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.textContent = "if (window.jQuery) (" + f.toString() + ")(window.jQuery)" + "\n\n//# sourceURL=" + encodeURI(GM_info.script.namespace.replace(/\/?$/, "/")) + encodeURIComponent(GM_info.script.name); // make this easier to debug
  document.body.appendChild(script);
}


with_jquery(function()
{
   if ( !$(".js-watched-tag-list").length) return;
   
   // load saved preferences, if any
   var prefsKey = "ReorderableFavoriteTags" + (StackExchange.options.site.routePrefix||"");
   var tagOrder = localStorage[prefsKey]||"";
   tagOrder = tagOrder.split(",");
   
   ApplyOrder();
   
   // known bug: when editing ends, tags remain sortable
   $(".js-edit-all-tags, .js-edit-watched-tags, .js-show-add-watched").click(function()
   {
      // What's gotta happen here:
      //    1. Autocomplete plugin has to load: this almost certainly means that the event has to pass through to default handler before we do anything. 
      //    2. We have to load jQueryUI without stomping on the default autocomplete plugin
      //    3. Finally, we can make the list sortable

      waitForAutocomplete(function()
      {      
         // the tag editor uses a very old version (somewhat patched) of jQuery.autocomplete
         // jQueryUI uses a newer one
         // they aren't compatible, at least not to the extent that the old one can initialize data and the new one can use it
         // so, save before loading jQueryUI and restore afterwards
         var oldAutocomplete = $.fn.autocomplete;
         var oldAutocompleter = $.Autocompleter;
         StackExchange.loadJqueryUi().then(function() 
         {
            if ( oldAutocomplete ) $.fn.autocomplete = oldAutocomplete;
            if ( oldAutocompleter ) $.fn.Autocompleter = oldAutocompleter;
            $(".js-watched-tag-list").sortable({helper: "clone", update: SaveOrder});
         });
      });
   });
   
   // capture saving of tag additions / removals, trigger re-application and then saving of order thus imposing consistency
   $(document)
      .ajaxSuccess(function(event, XMLHttpRequest, ajaxOptions)
      {
         if (ajaxOptions.url.indexOf("/users/save-preference") == 0
            || /\/tags\/[^\/]\/favorite/.test(ajaxOptions.url)
            || /\/tags\/[^\/]\/prefs/.test(ajaxOptions.url) )         
         {
            setTimeout(function() { ApplyOrder(); SaveOrder(); }, 0);
         }
      });
      
   function waitForAutocomplete(callback, delay)
   {
      delay = delay ? Math.max(delay*10, 1000) : 1;
      if ( $.fn.autocomplete ) callback();
      else setTimeout(() => waitForAutocomplete(callback, delay), delay);
   }
      
   function ApplyOrder()
   {
      var tagsOnPage=$(".js-watched-tag-list>.js-tag");
      for (let i=tagOrder.length-1; i>= 0; --i)
      {
         tagsOnPage.filter(function() { return this.textContent==tagOrder[i]}).prependTo(".js-watched-tag-list");
      }
   }
   
   function SaveOrder()
   {
      tagOrder = $(".js-watched-tag-list>.js-tag").map(function() { return this.textContent }).toArray();
      localStorage[prefsKey] = tagOrder.join();
   }
});