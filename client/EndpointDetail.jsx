import { 
  CssBaseline,
  Grid, 
  Container,
  Divider,
  Card,
  CardHeader,
  CardContent,
  Button,
  Tab, 
  Tabs,
  Typography,
  Box
} from '@material-ui/core';
import { StyledCard, PageCanvas } from 'material-fhir-ui';

import { get, has, set } from 'lodash';

import React from 'react';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import ReactMixin from 'react-mixin';

import { Session } from 'meteor/session';


let defaultEndpoint = {
  "resourceType" : "Endpoint",
  "name" : [{
    "text" : "",
    "resourceType" : "HumanName"
  }],
  "active" : true,
  "gender" : "",
  "birthDate" : '',
  "photo" : [{
    url: ""
  }],
  identifier: [{
    "use": "usual",
    "type": {
      "coding": [
        {
          "system": "http://hl7.org/fhir/v2/0203",
          "code": "MR"
        }
      ]
    },
    "value": ""
  }],
  "test" : false
};


Session.setDefault('endpointUpsert', false);
Session.setDefault('selectedEndpoint', false);

export class EndpointDetail extends React.Component {
  getMeteorData() {
    let data = {
      endpointId: false,
      endpoint: defaultEndpoint,
      endpointName: 'localhost',
      endpointAddress: 'http://localhost/dstu2'
    };

    if (Session.get('endpointUpsert')) {
      data.endpoint = Session.get('endpointUpsert');
    } else {
      if (Session.get('selectedEndpoint')) {
        data.endpointId = Session.get('selectedEndpoint');
        console.log("selectedEndpoint", Session.get('selectedEndpoint'));

        let selectedEndpoint = Endpoints.findOne({_id: Session.get('selectedEndpoint')});
        console.log("selectedEndpoint", selectedEndpoint);

        if (selectedEndpoint) {
          data.endpoint = selectedEndpoint;

          if (typeof selectedEndpoint.birthDate === "object") {
            data.endpoint.birthDate = moment(selectedEndpoint.birthDate).add(1, 'day').format("YYYY-MM-DD");
          }
        }
      } else {
        data.endpoint = defaultEndpoint;
      }
    }

    if(process.env.NODE_ENV === "test") console.log("EndpointDetail[data]", data);
    return data;
  }

  render() {
    return (
      <div id={this.props.id} className="endpointDetail">
        <CardContent>
          <TextField
            id='nameInput'
            // ref='name'
            name='name'
            floatingLabelText='Name'
            hintText={this.data.endpointName}
            // value={ get(this, 'data.endpoint.name', '')}
            onChange={ this.changeState.bind(this, 'name')}
            fullWidth
            /><br/>
          <TextField
            id='addressInput'
            // ref='address'
            name='address'
            floatingLabelText='Address'
            hintText={this.data.endpointAddress}
            // value={ get(this, 'data.endpoint.address[0].url', '')}
            // onChange={ this.changeState.bind(this, 'address')}
            // floatingLabelFixed={false}
            fullWidth
            /><br/>
        </CardContent>
        <CardActions>
          { this.determineButtons(this.data.endpointId) }
        </CardActions>
      </div>
    );
  }
  determineButtons(endpointId){
    if (endpointId) {
      return (
        <div>
          <Button id='saveEndpointButton' className='saveEndpointButton' primary={true} onClick={this.handleSaveButton.bind(this)} style={{marginRight: '20px'}} >Save</Button>
          <Button onClick={this.handleDeleteButton.bind(this)} >Delete</Button>
        </div>
      );
    } else {
      return(
        <Button id='saveEndpointButton'  className='saveEndpointButton' primary={true} onClick={this.handleSaveButton.bind(this)} >Save</Button>
      );
    }
  }

  changeState(field, event, value){
    let endpointUpdate;

    if(process.env.TRACE) console.log("endpointDetail.changeState", field, event, value);

    // by default, assume there's no other data and we're creating a new endpoint
    if (Session.get('endpointUpsert')) {
      endpointUpdate = Session.get('endpointUpsert');
    } else {
      endpointUpdate = defaultEndpoint;
    }



    // if there's an existing endpoint, use them
    if (Session.get('selectedEndpoint')) {
      endpointUpdate = this.data.endpoint;
    }

    switch (field) {
      case "name":
        endpointUpdate.name[0].text = value;
        break;
      case "gender":
        endpointUpdate.gender = value.toLowerCase();
        break;
      case "birthDate":
        endpointUpdate.birthDate = value;
        break;
      case "photo":
        endpointUpdate.photo[0].url = value;
        break;
      case "mrn":
        endpointUpdate.identifier[0].value = value;
        break;
      default:

    }
    // endpointUpdate[field] = value;
    process.env.TRACE && console.log("endpointUpdate", endpointUpdate);

    Session.set('endpointUpsert', endpointUpdate);
  }


  // this could be a mixin
  handleSaveButton(){
    if(process.env.NODE_ENV === "test") console.log('handleSaveButton()');
    let endpointUpdate = Session.get('endpointUpsert', endpointUpdate);


    if (endpointUpdate.birthDate) {
      endpointUpdate.birthDate = new Date(endpointUpdate.birthDate);
    }
    if(process.env.NODE_ENV === "test") console.log("endpointUpdate", endpointUpdate);

    if (Session.get('selectedEndpoint')) {
      if(process.env.NODE_ENV === "test") console.log("Updating endpoint...");

      delete endpointUpdate._id;

      // not sure why we're having to respecify this; fix for a bug elsewhere
      endpointUpdate.resourceType = 'Endpoint';

      Endpoints.update({_id: Session.get('selectedEndpoint')}, {$set: endpointUpdate }, function(error, result){
        if (error) {
          if(process.env.NODE_ENV === "test") console.log("Endpoints.insert[error]", error);
          // Bert.alert(error.reason, 'danger');
        }
        if (result) {
          HipaaLogger.logEvent({eventType: "update", userId: Meteor.userId(), userName: Meteor.user().fullName(), collectionName: "Endpoints", recordId: Session.get('selectedEndpoint')});
          // Session.set('endpointUpdate', defaultEndpoint);
          Session.set('endpointUpsert', false);
          Session.set('selectedEndpoint', false);
          Session.set('endpointPageTabIndex', 1);
          // Bert.alert('Endpoint added!', 'success');
        }
      });
    } else {
      if(process.env.NODE_ENV === "test") console.log("Creating a new endpoint...", endpointUpdate);

      Endpoints.insert(endpointUpdate, function(error, result) {
        if (error) {
          if(process.env.NODE_ENV === "test")  console.log('Endpoints.insert[error]', error);
          // Bert.alert(error.reason, 'danger');
        }
        if (result) {
          HipaaLogger.logEvent({eventType: "create", userId: Meteor.userId(), userName: Meteor.user().fullName(), collectionName: "Endpoints", recordId: result});
          Session.set('endpointPageTabIndex', 1);
          Session.set('selectedEndpoint', false);
          Session.set('endpointUpsert', false);
          // Bert.alert('Endpoint added!', 'success');
        }
      });
    }
  }

  handleCancelButton(){
    Session.set('endpointPageTabIndex', 1);
  }

  handleDeleteButton(){
    Endpoints.remove({_id: Session.get('selectedEndpoint')}, function(error, result){
      if (error) {
        if(process.env.NODE_ENV === "test") console.log('Endpoints.insert[error]', error);
        // Bert.alert(error.reason, 'danger');
      }
      if (result) {
        HipaaLogger.logEvent({eventType: "delete", userId: Meteor.userId(), userName: Meteor.user().fullName(), collectionName: "Endpoints", recordId: Session.get('selectedEndpoint')});
        // Session.set('endpointUpdate', defaultEndpoint);
        Session.set('endpointUpsert', false);
        Session.set('endpointPageTabIndex', 1);
        Session.set('selectedEndpoint', false);
        // Bert.alert('Endpoint removed!', 'success');
      }
    });
  }
}


ReactMixin(EndpointDetail.prototype, ReactMeteorData);
export default EndpointDetail;