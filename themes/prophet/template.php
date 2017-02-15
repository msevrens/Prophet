<?php

/**
 * @file
 * template.php
 */

 /**
  * Implements hook_theme().
  */
  
function prophet_theme() {
  return array( 'thought_form' => array(
    'render element' => 'form',
    'path' => drupal_get_path('theme', 'prophet') . '/templates',
    'template' => 'thought-form',
    ),
  );
}

function prophet_form_views_exposed_form_alter(&$form, &$form_state) {
  if (!isset($form_state['view']->exposed_input['thought_type'])) {
    $form_state['input']['thought_type'] = 'All';
  }
}

function prophet_preprocess_page(&$variables) {
    if (isset($variables['node']->type)) {
        $nodetype = $variables['node']->type;
        $variables['theme_hook_suggestions'][] = 'page__' . $nodetype;
    }
}

drupal_add_js(drupal_get_path('theme', 'prophet') . '/js/script.js', array(
  'type' => 'file',
  'group' => JS_THEME,
));