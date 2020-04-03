import React from 'react'
import {Trans} from '@lingui/react'
import {t} from '@lingui/macro'
import {Table, Label, Button} from 'semantic-ui-react'
import Module from 'parser/core/Module'
import {getDataBy} from 'data'
import ACTIONS from 'data/ACTIONS'
import STATUSES from 'data/STATUSES'
import {ActionLink} from 'components/ui/DbLink'

export default class Swiftcast extends Module {
	static handle = 'swiftcast'
	static title = t('core.swiftcast.title')`Swiftcast Uses`
	static dependencies = [
		'timeline',
	]

	// {
	//    swiftcast : Event
	//    affectedCast : Event
	// }
	_swiftcastUses = []

	// Events
	_activeSwiftcast = null
	_affectedCast = null

	constructor(...args) {
		super(...args)

		this.addEventHook('cast', {by: 'player'}, this._onCast)
		this.addEventHook('complete', this._onComplete)
	}

	_onCast(event) {
		const action = getDataBy(ACTIONS, 'id', event.ability.guid)
		if (!action) {
			return
		}

		// If swiftcast was used but has expired, record the last swiftcast use
		if (this._activeSwiftcast && (this._activeSwiftcast.timestamp + (STATUSES.SWIFTCAST.duration * 1000) < event.timestamp)) {
			this._recordSwiftcastUse()
		}

		if (!this._activeSwiftcast) {
			// If swiftcast is not active, look for swiftcast usage only
			if (action.id === ACTIONS.SWIFTCAST.id) {
				this._activeSwiftcast = event
			}
		} else if (action.castTime > 0) {
			this._affectedCast = event
			this._recordSwiftcastUse()
		}
	}

	_onComplete() {
		//If Swiftcast is still active at the end of the fight, record the usage
		if (this._activeSwiftcast) {
			this._recordSwiftcastUse()
		}
	}

	output() {
		const swiftcastUses = this._swiftcastUses

		if (swiftcastUses.length === 0) {
			return
		}

		const rows = swiftcastUses.map(swiftcastUse => {
			let castsCell = <></>
			if (swiftcastUse.affectedCast) {
				castsCell = <Table.Cell>
					<ActionLink key={ACTIONS.SWIFTCAST.id} showName={false} {...ACTIONS.SWIFTCAST}/>
					<ActionLink key={swiftcastUse.affectedCast.ability.guid} {...getDataBy(ACTIONS, 'id', swiftcastUse.affectedCast.ability.guid)}/>
				</Table.Cell>
			} else {
				castsCell = <Table.Cell>
					<ActionLink key={ACTIONS.SWIFTCAST.id} showName={false} {...ACTIONS.SWIFTCAST}/>
					<Label horizontal size="small" color="red" pointing="left"><Trans id="core.swiftcast.expired">Swiftcast expired</Trans></Label>
				</Table.Cell>
			}
			return <Table.Row key={swiftcastUse.swiftcast.timestamp}>
				<Table.Cell>
					<Button
						circular
						compact
						icon="time"
						size="small"
						onClick={() => this.timeline.show(swiftcastUse.swiftcast.timestamp - this.parser.fight.start_time, swiftcastUse.swiftcast.timestamp - this.parser.fight.start_time)}
						content={this.parser.formatTimestamp(swiftcastUse.swiftcast.timestamp)}
					/>
				</Table.Cell>
				{castsCell}
			</Table.Row>
		})

		return <Table>
			<Table.Header>
				<Table.Row key="header">
					<Table.HeaderCell><Trans id="core.swiftcast.time">Time</Trans></Table.HeaderCell>
					<Table.HeaderCell><Trans id="core.swiftcast.abilities-used">Abilities Used</Trans></Table.HeaderCell>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{rows}
			</Table.Body>
		</Table>
	}

	_recordSwiftcastUse() {
		this._swiftcastUses.push({
			swiftcast: this._activeSwiftcast,
			affectedCast: this._affectedCast,
		})
		this._activeSwiftcast = null
		this._affectedCast = null
	}
}
