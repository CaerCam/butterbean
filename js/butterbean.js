( function() {

	// Bail if we don't have the JSON, which is passed in via `wp_localize_script()`.
	if ( _.isUndefined( butterbean_data ) ) {
		return;
	}

	/* === Backbone + Underscore === */

	// Set up a variable to house our views.
	var views = { managers : {}, sections : {}, controls : {} };

	// Set up a variable to house our templates.
	var templates = { managers : {}, sections : {}, controls : {} };

	// Nav template.
	var nav_template = wp.template( 'butterbean-nav' );

	/* === Models === */

	// Manager model (each manager is housed within a meta box).
	var Manager_Model = Backbone.Model.extend( {
		defaults: {
			name     : '',
			type     : '',
			sections : {},
			controls : {}
		}
	} );

	// Section model (each section belongs to a manager).
	var Section_Model = Backbone.Model.extend( {
		defaults: {
			name        : '',
			type        : '',
			label       : '',
			description : '',
			icon        : '',
			manager     : '',
			active      : false
		}
	} );

	// Control model (each control belongs to a manager and section).
	var Control_Model = Backbone.Model.extend( {
		defaults: {
			name        : '',
			type        : '',
			label       : '',
			description : '',
			icon        : '',
			value       : '',
			choices     : {},
			attr        : '',
			manager     : '',
			section     : '',
			setting     : ''
		}
	} );

	/* === Collections === */

	// Collection of sections.
	var Section_Collection = Backbone.Collection.extend( {
		model : Section_Model
	} );

	/* === Views === */

	// Manager view.  Handles the output of a manager.
	var Manager_View = Backbone.View.extend( {
		tagName : 'div',
		attributes : function() {
			return {
				'id'    : 'butterbean-manager-' + this.model.get( 'name' ),
				'class' : 'butterbean-manager butterbean-manager-' + this.model.get( 'type' )
			};
		},
		initialize : function( options ) {

			var type = this.model.get( 'type' );

			if ( _.isUndefined( templates.managers[ type ] ) ) {
				templates.managers[ type ] = wp.template( 'butterbean-manager-' + type );
			}

			this.template = templates.managers[ type ];
		},
		render : function() {
			this.el.innerHTML = this.template( this.model.toJSON() );
			return this;
		},
		subview_render : function() {

			// Create a new section collection.
			var section_collection = new Section_Collection();

			// Loop through each section and add it to the collection.
			_.each( this.model.get( 'sections' ), function( data ) {

				section_collection.add( new Section_Model( data ) );
			} );

			// Loop through each manager in the collection and render its view.
			section_collection.forEach( function( section, i ) {

				var nav_view     = new Nav_View(     { model : section } );
				var section_view = new Section_View( { model : section } );

				document.querySelector( '#butterbean-ui-' + section.get( 'manager' ) + ' .butterbean-nav'     ).appendChild( nav_view.render().el     );
				document.querySelector( '#butterbean-ui-' + section.get( 'manager' ) + ' .butterbean-content' ).appendChild( section_view.render().el );

				// If the first model, set it to active.
				section.set( 'active', 0 == i );
			}, this );

			// Loop through each control for the manager and render its view.
			_.each( this.model.get( 'controls' ), function( data ) {

				var control = new Control_Model( data );

				var callback = _.isUndefined( views.controls[ data.type ] ) ? views.controls[ 'default' ] : views.controls[ data.type ];

				var view = new callback( { model : control } );

				document.getElementById( 'butterbean-' + control.get( 'manager' ) + '-section-' + control.get( 'section' ) ).appendChild( view.render().el );
			} );

			return this;
		}
	} );

	// Section view.  Handles the output of a section.
	var Section_View = Backbone.View.extend( {
		tagName : 'div',
		attributes : function() {
			return {
				'id'          : 'butterbean-' + this.model.get( 'manager' ) + '-section-' + this.model.get( 'name' ),
				'class'       : 'butterbean-section butterbean-section-' + this.model.get( 'type' ),
				'aria-hidden' : ! this.model.get( 'active' )
			};
		},
		initialize: function( options ) {
			this.model.on('change', this.onchange, this);

			var type = this.model.get( 'type' );

			if ( _.isUndefined( templates.sections[ type ] ) ) {
				templates.sections[ type ] = wp.template( 'butterbean-section-' + type );
			}

			this.template = templates.sections[ type ];
		},
		render: function() {
			this.el.innerHTML = this.template( this.model.toJSON() );
			return this;
		},
		onchange : function() {

			// Set the view's `aria-hidden` attribute based on whether the model is active.
			this.el.setAttribute( 'aria-hidden', ! this.model.get( 'active' ) );
		},
	} );

	// Nav view.
	var Nav_View = Backbone.View.extend( {
		template : nav_template,
		tagName : 'li',
		attributes : function() {
			return {
				'aria-selected' : this.model.get( 'active' )
			};
		},
		initialize : function() {
			this.model.on('change', this.render, this);
			this.model.on('change', this.onchange, this);
		},
		render : function() {
			this.el.innerHTML = this.template( this.model.toJSON() );
			return this;
		},
		events : {
			'click a' : 'onselect'
		},
		onchange : function() {

			// Set the `aria-selected` attibute based on the model active state.
			this.el.setAttribute( 'aria-selected', this.model.get( 'active' ) );
		},
		onselect : function( event ) {
			event.preventDefault();

			// Loop through each of the models in the collection and set them to inactive.
			_.each( this.model.collection.models, function( m ) {

				m.set( 'active', false );
			}, this );

			// Set this view's model to active.
			this.model.set( 'active', true );
		}
	} );

	// Control view. Handles the output of a control.
	views.controls.default = Backbone.View.extend( {
		tagName : 'div',
		attributes : function() {
			return {
				'id'    : 'butterbean-control-' + this.model.get( 'name' ),
				'class' : 'butterbean-control butterbean-control-' + this.model.get( 'type' )
			};
		},
		initialize: function( options ) {
			var type = this.model.get( 'type' );

			// Only add a new control template if we have a different control type.
			if ( _.isUndefined( templates.controls[ type ] ) ) {
				templates.controls[ type ] = wp.template( 'butterbean-control-' + type );
			}

			this.template = templates.controls[ type ];

			this.ready();
		},
		render: function(){
			this.el.innerHTML = this.template( this.model.toJSON() );
			return this;
		},
		ready : function() {}
	} );

	// Palette control view.
	views.controls.palette = views.controls.default.extend( {
		events : {
			'change input' : 'onselect'
		},
		ready : function() {

			_.bindAll( this, 'render' );
			this.model.bind( 'change', this.render );
		},
		onselect : function() {

			var value = document.querySelector( '#' + this.el.id + ' input:checked' ).getAttribute( 'value' );

			var choices = this.model.get( 'choices' );

			_.each( choices, function( choice, key ) {
				choice.selected = key === value;
			} );

			this.model.set( 'choices', choices ).trigger( 'change', this.model );
		}
	} );

	// Image control view.
	views.controls.image = views.controls.default.extend( {
		events : {
			'click .butterbean-add-media'    : 'showmodal',
			'click .butterbean-change-media' : 'showmodal',
			'click .butterbean-remove-media' : 'removemedia'
		},
		ready : function() {

			_.bindAll( this, 'render' );
			this.model.bind( 'change', this.render );
		},
		showmodal : function() {

			if ( ! _.isUndefined( this.modal ) ) {

				this.modal.open();
				return;
			}

			this.modal = wp.media( {
				frame    : 'select',
				multiple : false,
				editing  : true,
				title    : this.model.get( 'l10n' ).choose,
				library  : { type : 'image' },
				button   : { text:  this.model.get( 'l10n' ).set }
			} );

			this.modal.on( 'select', function() {

				var media = this.modal.state().get( 'selection' ).first().toJSON();

				this.model.set( {
					src   : media.sizes.large ? media.sizes.large.url : media.url,
					alt   : media.alt,
					value : media.id
				} );
			}, this );

			this.modal.open();
		},
		removemedia : function() {

			this.model.set( { src : '', alt : '', value : '' } );
		}
	} );

	// Loop through each of the managers and render their views.
	_.each( butterbean_data.managers, function( data ) {

		// Create a new manager model.
		var manager = new Manager_Model( data );

		// Create a new manager view.
		var view = new Manager_View( { model : manager } );

		// Add the `.butterbean-ui` class to the meta box.
		document.getElementById( 'butterbean-ui-' + manager.get( 'name' ) ).className += ' butterbean-ui';

		// Render the manager view.
		document.querySelector( '#butterbean-ui-' + manager.get( 'name' ) + ' .inside' ).appendChild( view.render().el );

		// Render the manager subviews.
		view.subview_render();
	} );

	/* ====== Add classes ====== */

	// Looks for `.hndle` and adds the `.butterbean-title` class.
	document.querySelector( '.butterbean-ui .hndle' ).className += ' butterbean-title';

	// Adds the core WP `.description` class to any `.butterbean-description` elements.
	document.querySelector( '.butterbean-ui .butterbean-description' ).className += ' description';

}() );
