/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { useRefEffect } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import { store as blockEditorStore } from '../../../store';
import { getBlockClientId } from '../../../utils/dom';

function toggleRichText( container, toggle ) {
	Array.from(
		container
			.closest( '.is-root-container' )
			.querySelectorAll( '.rich-text' )
	).forEach( ( node ) => {
		if ( toggle ) {
			node.setAttribute( 'contenteditable', true );
		} else {
			node.removeAttribute( 'contenteditable' );
		}
	} );
}

/**
 * Sets a multi-selection based on the native selection across blocks.
 *
 * @param {string} clientId Block client ID.
 */
export function useMultiSelection( clientId ) {
	const {
		startMultiSelect,
		stopMultiSelect,
		multiSelect,
		selectBlock,
	} = useDispatch( blockEditorStore );
	const { isSelectionEnabled, isBlockSelected, getBlockParents } = useSelect(
		blockEditorStore
	);
	return useRefEffect(
		( node ) => {
			const { ownerDocument } = node;
			const { defaultView } = ownerDocument;

			let anchorElement;
			let rafId;

			function onSelectionChange( { isSelectionEnd } ) {
				const selection = defaultView.getSelection();

				// If no selection is found, end multi selection and enable all rich
				// text areas.
				if ( ! selection.rangeCount || selection.isCollapsed ) {
					toggleRichText( node, true );
					return;
				}

				const endClientId = getBlockClientId( selection.focusNode );
				const isSingularSelection = clientId === endClientId;

				if ( isSingularSelection ) {
					selectBlock( clientId );

					// If the selection is complete (on mouse up), and no
					// multiple blocks have been selected, set focus back to the
					// anchor element. if the anchor element contains the
					// selection. Additionally, rich text elements that were
					// previously disabled can now be enabled again.
					if ( isSelectionEnd ) {
						toggleRichText( node, true );

						if ( selection.rangeCount ) {
							const {
								commonAncestorContainer,
							} = selection.getRangeAt( 0 );

							if (
								anchorElement.contains(
									commonAncestorContainer
								)
							) {
								anchorElement.focus();
							}
						}
					}
				} else {
					const startPath = [
						...getBlockParents( clientId ),
						clientId,
					];
					const endPath = [
						...getBlockParents( endClientId ),
						endClientId,
					];
					const depth =
						Math.min( startPath.length, endPath.length ) - 1;

					multiSelect( startPath[ depth ], endPath[ depth ] );
				}
			}

			function onSelectionEnd() {
				ownerDocument.removeEventListener(
					'selectionchange',
					onSelectionChange
				);
				// Equivalent to attaching the listener once.
				defaultView.removeEventListener( 'mouseup', onSelectionEnd );
				// The browser selection won't have updated yet at this point,
				// so wait until the next animation frame to get the browser
				// selection.
				rafId = defaultView.requestAnimationFrame( () => {
					onSelectionChange( { isSelectionEnd: true } );
					stopMultiSelect();
				} );
			}

			function onMouseLeave( { buttons } ) {
				// The primary button must be pressed to initiate selection.
				// See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
				if ( buttons !== 1 ) {
					return;
				}

				if ( ! isSelectionEnabled() || ! isBlockSelected( clientId ) ) {
					return;
				}

				anchorElement = ownerDocument.activeElement;
				startMultiSelect();

				// `onSelectionStart` is called after `mousedown` and
				// `mouseleave` (from a block). The selection ends when
				// `mouseup` happens anywhere in the window.
				ownerDocument.addEventListener(
					'selectionchange',
					onSelectionChange
				);
				defaultView.addEventListener( 'mouseup', onSelectionEnd );

				// Removing the contenteditable attributes within the block
				// editor is essential for selection to work across editable
				// areas. The edible hosts are removed, allowing selection to be
				// extended outside the DOM element. `startMultiSelect` sets a
				// flag in the store so the rich text components are updated,
				// but the rerender may happen very slowly, especially in Safari
				// for the blocks that are asynchonously rendered. To ensure the
				// browser instantly removes the selection boundaries, we remove
				// the contenteditable attributes manually.
				toggleRichText( node, false );
			}

			node.addEventListener( 'mouseleave', onMouseLeave );

			return () => {
				node.removeEventListener( 'mouseleave', onMouseLeave );
				ownerDocument.removeEventListener(
					'selectionchange',
					onSelectionChange
				);
				defaultView.removeEventListener( 'mouseup', onSelectionEnd );
				defaultView.cancelAnimationFrame( rafId );
			};
		},
		[
			clientId,
			startMultiSelect,
			stopMultiSelect,
			multiSelect,
			selectBlock,
			isSelectionEnabled,
			isBlockSelected,
			getBlockParents,
		]
	);
}
