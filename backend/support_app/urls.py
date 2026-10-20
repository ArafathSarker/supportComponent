from django.urls import re_path
from . import views

urlpatterns = [
    re_path(r'^health/?$', views.health_check, name='health_check'),
    re_path(r'^tickets/stats/?$', views.ticket_stats, name='ticket_stats'),
    re_path(r'^tickets/?$', views.ticket_list_create, name='ticket_list_create'),
    re_path(r'^tickets/(?P<ticket_id>[^/]+)/status/?$', views.ticket_update_status, name='ticket_update_status'),
    re_path(r'^tickets/(?P<ticket_id>[^/]+)/close/?$', views.ticket_close, name='ticket_close'),
    re_path(r'^tickets/(?P<ticket_id>[^/]+)/reopen/?$', views.ticket_reopen, name='ticket_reopen'),
    re_path(r'^tickets/(?P<ticket_id>[^/]+)/messages/?$', views.ticket_messages, name='ticket_messages'),
    re_path(r'^tickets/(?P<ticket_id>[^/]+)/?$', views.ticket_detail, name='ticket_detail'),
    re_path(r'^upload/?$', views.upload_file, name='upload_file'),
    re_path(r'^visiting/?$', views.visiting_list_create, name='visiting_list_create'),
    re_path(r'^visiting/(?P<visit_id>[^/]+)/acknowledge/?$', views.visiting_acknowledge, name='visiting_acknowledge'),
    re_path(r'^visiting/(?P<visit_id>[^/]+)/complete/?$', views.visiting_complete, name='visiting_complete'),
    re_path(r'^visiting/(?P<visit_id>[^/]+)/?$', views.visiting_detail, name='visiting_detail'),
]
