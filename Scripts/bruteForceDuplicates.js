
// Since hash tables are not supported by servicenos this is a bruteforce solution for the issue
//This code will be a sheduled job that runs every day at 00:00:00 GMT 
//This code match the persosn that are in the same flight for the current day
// if more than one person are in the same flight i will send a notification to a certain group
// if that flight is denominated hight risked it will send a notification for the regional manager for each region if it exist.

var aux = {};
var auxTravelers = [];
var grTravels = new GlideRecord('u_travel_transportation');
grTravels.addQuery('u_requestor_tripISNOTEMPTY^u_global_departure_dateONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()');
grTravels.query();
while(grTravels.next()){
	var grTravelMatcher = new GlideRecord('u_travel_transportation');
	grTravelMatcher.addQuery('u_inbound_flight_train_number',grTravels.getValue('u_inbound_flight_train_number'));
	grTravelMatcher.query();
	while(grTravelMatcher.next()){
        auxTravelers.push({user:grTravelMatcher.getDisplayValue('u_requestor_trip'),pnr:grTravelMatcher.getDisplayValue('u_pnr_locator')});
        gs.info(auxTravelers)
	}
	if(auxTravelers.length > 0){
		if(!aux[grTravels.getDisplayValue('u_inbound_flight_train_number')]){
			aux[grTravels.getDisplayValue('u_inbound_flight_train_number')]=
				{
                travelesUsers:auxTravelers,
				flighNumber:grTravels.getDisplayValue('u_inbound_flight_train_number'),
				carrier:grTravels.getDisplayValue('u_inbound_air_rail_carrier'),
				risk:grTravels.getDisplayValue('u_risk'),
				date:grTravels.getDisplayValue('u_global_departure_date'),
				departureCode:grTravels.getDisplayValue('u_inbound_flight_rail_departure_city_state'),
				stayCode:grTravels.getDisplayValue('u_inbound_flight_rail_arrival_city_state')
			};
            auxTravelers = [];
		}

	}
}
for (var n in aux){
	if(aux[n].risk == 'High'|| aux[n].risk=="Extreme"){
		var auxRisk = [];
		auxRisk.push(getGerentusers(aux[n].departureCode));
		auxRisk.push(getGerentusers(aux[n].stayCode));
		gs.eventQueue('same.travel.notification.scheduled',grTravels,JSON.stringify(aux[n]),auxRisk+"");
	}else{
        gs.info('test')
		gs.eventQueue('same.travel.notification.scheduled',grTravels,JSON.stringify(aux[n]),null);
	}
}
function getGerentusers(cityCode){ 
	var auxMembers =[];
	var grTravelStations = new GlideRecord('u_transport_station');
	grTravelStations.addQuery('u_iata_code',cityCode);
	grTravelStations.addQuery('u_country!=NULL');
	grTravelStations.query();
	if(grTravelStations.next()){
		var grCoreContry = new GlideRecord('core_country');
		grCoreContry.get(grTravelStations.u_country);
		if(grCoreContry){
			var grCoreRegion = new GlideRecord('u_core_region');
			grCoreRegion.addQuery('u_code',grCoreContry.iso3166_2); 
			grCoreRegion.query();
			if(grCoreRegion.next()){
				var grGroup = new GlideRecord('sys_user_group');
				grGroup.addQuery('u_regionsLIKE'+grCoreRegion.sys_id);
				grGroup.query();
				if(grGroup.next()){
					var grGroupMember = new GlideRecord('sys_user_grmember');
					grGroupMember.addQuery('group',grGroup.sys_id);
					grGroupMember.query();
					while(grGroupMember.next()){
						auxMembers.push(grGroupMember.getValue('user'));
					}
				}
			}
		}
	}
	return auxMembers+"";
}