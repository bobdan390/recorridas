import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, AlertController, IonModal, IonButton, IonItem, IonSelect, IonSelectOption, LoadingController } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { AngularFireStorage } from "@angular/fire/compat/storage";
import { NgFor, NgIf } from '@angular/common';
import { BarcodeScanner } from '@awesome-cordova-plugins/barcode-scanner';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FormsModule } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import { getDownloadURL } from "firebase/storage";
import { LocalNotificationSchema, LocalNotifications, ScheduleResult } from '@capacitor/local-notifications';
import * as moment from 'moment';

declare var google: any;


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ExploreContainerComponent, NgFor, NgIf, IonModal, IonButton, IonItem, IonSelect, IonSelectOption, FormsModule],
})

export class Tab1Page {
  //DB
  url_rondas = "SERVICIO_1/RONDAS"
  url_rondas_realizadas = `${this.url_rondas}/RONDAS_REALIZADAS`

  //USER
  label_1 = "Operario 1"
  user_id_1 = "85646778546"

  //RONDA
  id_ronda = "";
  index_ronda = 0;
  turnoSeleccionado:any = "";
  turnos:any = [];
  puntos:any = []
  puntos_BEGIN:any = [
    {
      nombre: "Punto 1",
      indicaciones: "Tomar foto"
    },
    {
      nombre: "Punto 2"
    },
    {
      nombre: "Punto 3"
    },
    {
      nombre: "Punto 4",
      indicaciones: "Tomar foto"
    }
  ]
  puntoAbierto:any = null;
  momentjs: any = moment;

  //MAP
  isOpen = false;
  @ViewChild('statusMap',  {static: false}) mapElement: ElementRef | undefined;
  statusMap: any;
  directionsService:any;
  directionsRenderer:any;

  begin = new Date()

  constructor(
    private loadingCtrl: LoadingController,
    private afs : AngularFireDatabase,
    private alert : AlertController,
    private fsStorage: AngularFireStorage
  ) {
    
  }

  ionViewWillEnter() {
    this.afs.database.ref(this.url_rondas).get().then(async(res) => {
      
      //create new alarms
      this.begin.setHours(res.val()?.Ronda_Desde.split(":")[0]);
      this.begin.setMinutes(res.val()?.Ronda_Desde.split(":")[1]);

      var finish = new Date();
      finish.setHours(res.val()?.Ronda_Hasta.split(":")[0]);
      finish.setMinutes(res.val()?.Ronda_Hasta.split(":")[1]);

      let interval_ronda = parseInt(res.val()?.Ronda_Cada);

      var fecha1 = moment(this.begin);
      var fecha2 = moment(finish);
      var diff = fecha2.diff(fecha1, 'm'); // Diff in minutes
      let _count = parseInt((diff / interval_ronda) + "");  
      
      var fecha3 = moment(new Date);
      var diff1 = fecha3.diff(fecha1, 'm'); // Diff in minutes
      this.index_ronda = parseInt((diff1 / interval_ronda) + "")

      const areEnabled = await LocalNotifications.checkPermissions();

      if(areEnabled.display != "granted"){
        await LocalNotifications.requestPermissions();
      }

      var notificationsLIST: LocalNotificationSchema[] = [];

      await LocalNotifications.createChannel({
        id: "alertas",
        name: "alertas",
        description: "Canal para notificaciones locales",
        sound: "beep.wav",
        importance: 1,
        lights: true,
        vibration: true
      });

      let randomId = Math.floor(Math.random() * 1000000) + 1;

      
      var objectChedule: LocalNotificationSchema = {
        title:"Inicio de la RONDA",
        body: "Debe iniciar la ronda en este momento!",
        id: randomId,
        schedule: {
          at: this.begin,
          allowWhileIdle: true,
          repeats: true,
          every: "minute",
          on: {
            minute: interval_ronda
          },
          count: _count
        },
        channelId: "alertas"
      };

      notificationsLIST.push(objectChedule);

      var scheduleResult: ScheduleResult = await LocalNotifications.schedule({notifications: notificationsLIST });
      
      this.turnoSeleccionado = {
        inicio: res.val()?.Ronda_Desde,
        fin: res.val()?.Ronda_Hasta
      }

      this.afs.database.ref(`${this.url_rondas_realizadas}/${this.getID()}/_${this.index_ronda}`).get().then(res_1 => {
        if(res_1?.val()){
          this.puntos = res_1?.val()
          this.id_ronda = this.getID();
        }
      });

    });
  }

  abrirDetallesPunto = (index:any) => {

    //verificar puntos anteriores para no abrir las opciones
    if(index > 0 && [undefined, null].includes(this.puntos[(index - 1)].scan)){
      return
    }
    this.puntoAbierto = this.puntoAbierto == index ? null : index
  }


  async scan(index:any): Promise<void> {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      const data = await BarcodeScanner.scan();    
      if(typeof data.text === "string"){
        this.puntos[index].scan = data.text
        this.puntos[index].latitud = coordinates?.coords?.latitude
        this.puntos[index].longitud = coordinates?.coords?.longitude
        this.afs.database.ref(this.url_rondas_realizadas).child(this.id_ronda).child("_" + this.index_ronda).update(this.puntos).then(async ()=>{
          const alert = await this.alert.create({
            header: 'QR registrado !!',
            buttons: ['OK'],
          });
          await alert.present();
        })
      }
    } catch (error) {
      const alert = await this.alert.create({
        header: 'Activa la ubicación del dispositivo!',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  openMap = (item:any) => {
    
    this.isOpen = true;
    let mapOptions = {
        center: new google.maps.LatLng(item?.latitud ?? 10.496539, item.longitud ?? -66.886014),
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl:false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: false
    }

    setTimeout(()=>{
      this.statusMap = new google.maps.Map(this.mapElement?.nativeElement, mapOptions);

      if(item?.latitud){
        new google.maps.Marker({
          position: new google.maps.LatLng(item?.latitud ?? 10.496539, item.longitud ?? -66.886014),
          title:""
        }).setMap(this.statusMap);
      }

      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true
      });
      this.directionsRenderer.setMap(this.statusMap);

      let waypts: any[] = [];
      let origin = new google.maps.LatLng(this.puntos[0].latitud, this.puntos[0].longitud)
      let destination = new google.maps.LatLng(this.puntos[this.puntos.length - 1].latitud, this.puntos[this.puntos.length - 1].longitud)


      this.puntos.map((_p:any)=>{

        new google.maps.Marker({
          position: new google.maps.LatLng(_p.latitud, _p.longitud),
          title:""
        }).setMap(this.statusMap);

        waypts.push({
          location: new google.maps.LatLng(_p.latitud, _p.longitud),
          stopover: true
        })
      })

      let request = {
        origin: origin,
        destination: destination,
        waypoints: waypts,
        travelMode: 'WALKING'
      };

      this.directionsService.route(request, (result:any, status:any) => {
        if (status == 'OK') {
          this.directionsRenderer.setDirections(result);
        }
      });

    }, 500)
   
  }

  onDismissChange = () => {
    this.isOpen = false
  }

  takePicture = async (item:any, i:any) => {
    const image:any = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    });

    const loading = await this.loadingCtrl.create({
      message: 'Espere...',
      cssClass: 'custom-loading',
    });
    loading.present();
    
    this.fsStorage.ref(`captura_foto_${this.id_ronda}_${this.index_ronda}_${i}.png`).putString(image.base64String, 'base64').then((snapshot) => {
      getDownloadURL(snapshot.ref).then((downloadURL:any) => {
        loading.dismiss();
        this.puntos[i].foto = downloadURL
        this.afs.database.ref(this.url_rondas_realizadas).child(this.id_ronda).child("_" + this.index_ronda).update(this.puntos).then(async ()=>{
          const alert = await this.alert.create({
            header: 'Imagen registrada !!',
            buttons: ['OK'],
          });
          await alert.present();
        })

      })
    }); 
  };

  getID = () => {
    const date = new Date();
    let _id = btoa(`${this.user_id_1}-${date.getDay()}-${date.getMonth()}-${this.turnoSeleccionado.inicio}`)
    return _id
  }

  comenzarRonda = async () => {

    if(moment(new Date) < moment(this.begin)){
      const alert = await this.alert.create({
        header: 'Espere la hora indicada para iniciar!',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    if(this.turnoSeleccionado){
      if(this.puntos.length == 0){
        this.puntos = this.puntos_BEGIN
        this.afs.database.ref(this.url_rondas_realizadas).child(this.getID()).child("_" + this.index_ronda).set(this.puntos).then(()=>{
          this.id_ronda = this.getID();
        })
      }
    }
  }
  
}
